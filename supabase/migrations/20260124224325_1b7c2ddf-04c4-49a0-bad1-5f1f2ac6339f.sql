
-- =====================================================
-- RPCs para Dashboard e Relatórios
-- Otimizadas com window functions e validação de membership
-- =====================================================

-- =====================================================
-- 1) GET_AGENT_DASHBOARD_METRICS
-- Métricas do atendente: leads no pipeline, aguardando resposta, vendas
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_agent_dashboard_metrics(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(
  leads_in_pipeline bigint,
  pending_replies bigint,
  sales_this_month bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  -- Validate membership
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH 
  -- Pipelines owned by this user
  user_pipelines AS (
    SELECT id FROM pipelines 
    WHERE workspace_id = p_workspace_id 
      AND owner_user_id = p_user_id
  ),
  -- Conversations in user's pipelines
  user_conversations AS (
    SELECT c.id, c.remote_jid
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.pipeline_id IN (SELECT id FROM user_pipelines)
  ),
  -- New leads: first event per remote_jid in period
  new_leads AS (
    SELECT COUNT(DISTINCT cef.remote_jid)::bigint AS cnt
    FROM analytics.conversation_event_facts cef
    WHERE cef.workspace_id = p_workspace_id
      AND cef.conversation_id IN (SELECT id FROM user_conversations)
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
      AND NOT EXISTS (
        SELECT 1 FROM analytics.conversation_event_facts older
        WHERE older.workspace_id = p_workspace_id
          AND older.remote_jid = cef.remote_jid
          AND COALESCE(older.message_ts, older.created_at) < p_start_date
      )
  ),
  -- Pending replies: last message is from client (from_me = false)
  pending AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM (
      SELECT DISTINCT ON (cef.conversation_id) 
        cef.conversation_id,
        cef.from_me
      FROM analytics.conversation_event_facts cef
      WHERE cef.workspace_id = p_workspace_id
        AND cef.conversation_id IN (SELECT id FROM user_conversations)
        AND cef.wa_message_id IS NOT NULL
      ORDER BY cef.conversation_id, COALESCE(cef.message_ts, cef.created_at) DESC
    ) last_msgs
    WHERE last_msgs.from_me = false
  ),
  -- Sales: cards in sale stages
  sales AS (
    SELECT COUNT(DISTINCT cards.id)::bigint AS cnt
    FROM cards
    JOIN stages ON cards.stage_id = stages.id
    WHERE cards.workspace_id = p_workspace_id
      AND stages.pipeline_id IN (SELECT id FROM user_pipelines)
      AND LOWER(stages.name) IN ('venda', 'fechado', 'ganho', 'won', 'closed', 'vendido')
      AND cards.updated_at >= p_start_date
      AND cards.updated_at <= p_end_date
  )
  SELECT 
    COALESCE(new_leads.cnt, 0) AS leads_in_pipeline,
    COALESCE(pending.cnt, 0) AS pending_replies,
    COALESCE(sales.cnt, 0) AS sales_this_month
  FROM new_leads, pending, sales;
END;
$$;

-- =====================================================
-- 2) GET_PENDING_REPLIES_LIST
-- Lista de conversas aguardando resposta do atendente
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_pending_replies_list(
  p_workspace_id uuid,
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  conversation_id uuid,
  contact_name text,
  remote_jid text,
  last_message_body text,
  last_message_at timestamp with time zone,
  waiting_minutes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  -- Validate membership
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH 
  user_pipelines AS (
    SELECT id FROM pipelines 
    WHERE workspace_id = p_workspace_id 
      AND owner_user_id = p_user_id
  ),
  user_conversations AS (
    SELECT c.id, c.contact_id
    FROM conversations c
    WHERE c.workspace_id = p_workspace_id
      AND c.pipeline_id IN (SELECT id FROM user_pipelines)
  ),
  last_messages AS (
    SELECT DISTINCT ON (cef.conversation_id)
      cef.conversation_id,
      cef.remote_jid,
      cef.push_name,
      cef.from_me,
      COALESCE(cef.message_ts, cef.created_at) AS msg_ts
    FROM analytics.conversation_event_facts cef
    WHERE cef.workspace_id = p_workspace_id
      AND cef.conversation_id IN (SELECT id FROM user_conversations)
      AND cef.wa_message_id IS NOT NULL
    ORDER BY cef.conversation_id, COALESCE(cef.message_ts, cef.created_at) DESC
  ),
  pending_convs AS (
    SELECT 
      lm.conversation_id,
      lm.remote_jid,
      lm.push_name,
      lm.msg_ts
    FROM last_messages lm
    WHERE lm.from_me = false
  )
  SELECT 
    pc.conversation_id,
    COALESCE(ct.name, pc.push_name, 'Desconhecido') AS contact_name,
    pc.remote_jid,
    COALESCE(
      (SELECT m.body FROM messages m WHERE m.conversation_id = pc.conversation_id ORDER BY m.created_at DESC LIMIT 1),
      ''
    ) AS last_message_body,
    pc.msg_ts AS last_message_at,
    EXTRACT(EPOCH FROM (NOW() - pc.msg_ts))::bigint / 60 AS waiting_minutes
  FROM pending_convs pc
  LEFT JOIN user_conversations uc ON uc.id = pc.conversation_id
  LEFT JOIN contacts ct ON ct.id = uc.contact_id
  ORDER BY pc.msg_ts ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3) GET_ADMIN_OVERVIEW_METRICS
-- Métricas gerais para admin: leads, pendentes, vendas, ads vs orgânico
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_admin_overview_metrics(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(
  total_new_leads bigint,
  pending_replies bigint,
  sales_this_month bigint,
  ads_leads bigint,
  organic_leads bigint,
  abandoned_conversations bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  -- Validate membership (admin check optional, just needs to be member)
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH 
  -- New leads: first event per remote_jid in period (distinct contacts)
  new_lead_events AS (
    SELECT 
      cef.remote_jid,
      cef.is_ad_lead,
      MIN(COALESCE(cef.message_ts, cef.created_at)) AS first_event
    FROM analytics.conversation_event_facts cef
    WHERE cef.workspace_id = p_workspace_id
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
    GROUP BY cef.remote_jid, cef.is_ad_lead
    HAVING MIN(COALESCE(cef.message_ts, cef.created_at)) >= p_start_date
      AND NOT EXISTS (
        SELECT 1 FROM analytics.conversation_event_facts older
        WHERE older.workspace_id = p_workspace_id
          AND older.remote_jid = cef.remote_jid
          AND COALESCE(older.message_ts, older.created_at) < p_start_date
      )
  ),
  lead_counts AS (
    SELECT 
      COUNT(DISTINCT remote_jid)::bigint AS total,
      COUNT(DISTINCT remote_jid) FILTER (WHERE is_ad_lead = true)::bigint AS from_ads,
      COUNT(DISTINCT remote_jid) FILTER (WHERE is_ad_lead = false OR is_ad_lead IS NULL)::bigint AS organic
    FROM new_lead_events
  ),
  -- Pending replies: last message is from client
  pending AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM (
      SELECT DISTINCT ON (cef.conversation_id) 
        cef.conversation_id,
        cef.from_me
      FROM analytics.conversation_event_facts cef
      WHERE cef.workspace_id = p_workspace_id
        AND cef.wa_message_id IS NOT NULL
      ORDER BY cef.conversation_id, COALESCE(cef.message_ts, cef.created_at) DESC
    ) last_msgs
    WHERE last_msgs.from_me = false
  ),
  -- Sales: cards in sale stages
  sales AS (
    SELECT COUNT(DISTINCT cards.id)::bigint AS cnt
    FROM cards
    JOIN stages ON cards.stage_id = stages.id
    WHERE cards.workspace_id = p_workspace_id
      AND LOWER(stages.name) IN ('venda', 'fechado', 'ganho', 'won', 'closed', 'vendido')
      AND cards.updated_at >= p_start_date
      AND cards.updated_at <= p_end_date
  ),
  -- Abandoned: last message from client > 24h ago
  abandoned AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM (
      SELECT DISTINCT ON (cef.conversation_id) 
        cef.conversation_id,
        cef.from_me,
        COALESCE(cef.message_ts, cef.created_at) AS msg_ts
      FROM analytics.conversation_event_facts cef
      WHERE cef.workspace_id = p_workspace_id
        AND cef.wa_message_id IS NOT NULL
      ORDER BY cef.conversation_id, COALESCE(cef.message_ts, cef.created_at) DESC
    ) last_msgs
    WHERE last_msgs.from_me = false
      AND last_msgs.msg_ts < NOW() - INTERVAL '24 hours'
  )
  SELECT 
    COALESCE(lead_counts.total, 0) AS total_new_leads,
    COALESCE(pending.cnt, 0) AS pending_replies,
    COALESCE(sales.cnt, 0) AS sales_this_month,
    COALESCE(lead_counts.from_ads, 0) AS ads_leads,
    COALESCE(lead_counts.organic, 0) AS organic_leads,
    COALESCE(abandoned.cnt, 0) AS abandoned_conversations
  FROM lead_counts, pending, sales, abandoned;
END;
$$;

-- =====================================================
-- 4) GET_AGENT_PERFORMANCE_RANKING
-- Ranking de atendentes com tempo médio de resposta (window functions)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_agent_performance_ranking(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(
  agent_user_id uuid,
  agent_name text,
  avg_response_time_minutes numeric,
  leads_count bigint,
  pending_replies bigint,
  sales_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  -- Validate membership
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH 
  -- All agents (pipeline owners) in workspace
  agents AS (
    SELECT DISTINCT p.owner_user_id AS user_id
    FROM pipelines p
    WHERE p.workspace_id = p_workspace_id
      AND p.owner_user_id IS NOT NULL
  ),
  -- Agent info from profiles
  agent_info AS (
    SELECT 
      a.user_id,
      COALESCE(pr.full_name, pr.email, 'Usuário') AS name
    FROM agents a
    LEFT JOIN profiles pr ON pr.id = a.user_id
  ),
  -- Conversations per agent (via pipeline ownership)
  agent_conversations AS (
    SELECT 
      p.owner_user_id AS agent_id,
      c.id AS conversation_id
    FROM conversations c
    JOIN pipelines p ON c.pipeline_id = p.id
    WHERE c.workspace_id = p_workspace_id
      AND p.owner_user_id IS NOT NULL
  ),
  -- Response times using window functions (no self-join)
  message_transitions AS (
    SELECT 
      ac.agent_id,
      cef.conversation_id,
      cef.from_me,
      COALESCE(cef.message_ts, cef.created_at) AS msg_ts,
      LAG(cef.from_me) OVER (
        PARTITION BY cef.conversation_id 
        ORDER BY COALESCE(cef.message_ts, cef.created_at)
      ) AS prev_from_me,
      LAG(COALESCE(cef.message_ts, cef.created_at)) OVER (
        PARTITION BY cef.conversation_id 
        ORDER BY COALESCE(cef.message_ts, cef.created_at)
      ) AS prev_msg_ts
    FROM analytics.conversation_event_facts cef
    JOIN agent_conversations ac ON ac.conversation_id = cef.conversation_id
    WHERE cef.workspace_id = p_workspace_id
      AND cef.wa_message_id IS NOT NULL
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
  ),
  -- Only client->agent transitions within 24h
  response_times AS (
    SELECT 
      agent_id,
      EXTRACT(EPOCH FROM (msg_ts - prev_msg_ts)) / 60 AS response_minutes
    FROM message_transitions
    WHERE prev_from_me = false  -- previous was from client
      AND from_me = true        -- current is from agent
      AND msg_ts - prev_msg_ts <= INTERVAL '24 hours'
      AND msg_ts > prev_msg_ts
  ),
  -- Average response time per agent
  avg_times AS (
    SELECT 
      agent_id,
      ROUND(AVG(response_minutes)::numeric, 1) AS avg_minutes
    FROM response_times
    GROUP BY agent_id
  ),
  -- New leads per agent
  agent_leads AS (
    SELECT 
      ac.agent_id,
      COUNT(DISTINCT cef.remote_jid)::bigint AS cnt
    FROM analytics.conversation_event_facts cef
    JOIN agent_conversations ac ON ac.conversation_id = cef.conversation_id
    WHERE cef.workspace_id = p_workspace_id
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
      AND NOT EXISTS (
        SELECT 1 FROM analytics.conversation_event_facts older
        WHERE older.workspace_id = p_workspace_id
          AND older.remote_jid = cef.remote_jid
          AND COALESCE(older.message_ts, older.created_at) < p_start_date
      )
    GROUP BY ac.agent_id
  ),
  -- Pending replies per agent
  agent_pending AS (
    SELECT 
      ac.agent_id,
      COUNT(*)::bigint AS cnt
    FROM (
      SELECT DISTINCT ON (cef.conversation_id)
        cef.conversation_id,
        cef.from_me
      FROM analytics.conversation_event_facts cef
      WHERE cef.workspace_id = p_workspace_id
        AND cef.wa_message_id IS NOT NULL
      ORDER BY cef.conversation_id, COALESCE(cef.message_ts, cef.created_at) DESC
    ) last_msgs
    JOIN agent_conversations ac ON ac.conversation_id = last_msgs.conversation_id
    WHERE last_msgs.from_me = false
    GROUP BY ac.agent_id
  ),
  -- Sales per agent
  agent_sales AS (
    SELECT 
      p.owner_user_id AS agent_id,
      COUNT(DISTINCT cards.id)::bigint AS cnt
    FROM cards
    JOIN stages ON cards.stage_id = stages.id
    JOIN pipelines p ON stages.pipeline_id = p.id
    WHERE cards.workspace_id = p_workspace_id
      AND LOWER(stages.name) IN ('venda', 'fechado', 'ganho', 'won', 'closed', 'vendido')
      AND cards.updated_at >= p_start_date
      AND cards.updated_at <= p_end_date
      AND p.owner_user_id IS NOT NULL
    GROUP BY p.owner_user_id
  )
  SELECT 
    ai.user_id AS agent_user_id,
    ai.name AS agent_name,
    COALESCE(at.avg_minutes, 0) AS avg_response_time_minutes,
    COALESCE(al.cnt, 0) AS leads_count,
    COALESCE(ap.cnt, 0) AS pending_replies,
    COALESCE(asales.cnt, 0) AS sales_count
  FROM agent_info ai
  LEFT JOIN avg_times at ON at.agent_id = ai.user_id
  LEFT JOIN agent_leads al ON al.agent_id = ai.user_id
  LEFT JOIN agent_pending ap ON ap.agent_id = ai.user_id
  LEFT JOIN agent_sales asales ON asales.agent_id = ai.user_id
  ORDER BY COALESCE(at.avg_minutes, 999999) ASC;
END;
$$;

-- =====================================================
-- 5) GET_ADS_VS_ORGANIC_TIMESERIES
-- Série temporal: leads por dia (Ads vs Orgânico)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_ads_vs_organic_timeseries(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(
  report_date date,
  ads_leads bigint,
  organic_leads bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
BEGIN
  -- Validate membership
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH first_events AS (
    SELECT 
      cef.remote_jid,
      cef.is_ad_lead,
      DATE(MIN(COALESCE(cef.message_ts, cef.created_at))) AS first_date
    FROM analytics.conversation_event_facts cef
    WHERE cef.workspace_id = p_workspace_id
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
    GROUP BY cef.remote_jid, cef.is_ad_lead
    HAVING NOT EXISTS (
      SELECT 1 FROM analytics.conversation_event_facts older
      WHERE older.workspace_id = p_workspace_id
        AND older.remote_jid = cef.remote_jid
        AND COALESCE(older.message_ts, older.created_at) < p_start_date
    )
  )
  SELECT 
    fe.first_date AS report_date,
    COUNT(DISTINCT fe.remote_jid) FILTER (WHERE fe.is_ad_lead = true)::bigint AS ads_leads,
    COUNT(DISTINCT fe.remote_jid) FILTER (WHERE fe.is_ad_lead = false OR fe.is_ad_lead IS NULL)::bigint AS organic_leads
  FROM first_events fe
  GROUP BY fe.first_date
  ORDER BY fe.first_date ASC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_agent_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_replies_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_performance_ranking TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ads_vs_organic_timeseries TO authenticated;
