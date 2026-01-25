-- Update get_admin_overview_metrics to limit pending_replies to 24h window
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
  IF NOT is_workspace_member(p_user_id, p_workspace_id) THEN
    RAISE EXCEPTION 'User is not a member of this workspace';
  END IF;

  RETURN QUERY
  WITH 
  -- FIXED: Use DISTINCT ON to get first event per lead (avoids duplication)
  new_lead_events AS (
    SELECT DISTINCT ON (cef.remote_jid)
      cef.remote_jid,
      cef.is_ad_lead,
      COALESCE(cef.message_ts, cef.created_at) AS first_event
    FROM analytics.conversation_event_facts cef
    WHERE cef.workspace_id = p_workspace_id
      AND COALESCE(cef.message_ts, cef.created_at) >= p_start_date
      AND COALESCE(cef.message_ts, cef.created_at) <= p_end_date
      AND NOT EXISTS (
        SELECT 1 FROM analytics.conversation_event_facts older
        WHERE older.workspace_id = p_workspace_id
          AND older.remote_jid = cef.remote_jid
          AND COALESCE(older.message_ts, older.created_at) < p_start_date
      )
    ORDER BY cef.remote_jid, COALESCE(cef.message_ts, cef.created_at) ASC
  ),
  lead_counts AS (
    SELECT 
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE is_ad_lead = true)::bigint AS from_ads,
      COUNT(*) FILTER (WHERE is_ad_lead = false OR is_ad_lead IS NULL)::bigint AS organic
    FROM new_lead_events
  ),
  -- Pending: last message from client, within period, AND within last 24 hours
  pending AS (
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
      AND last_msgs.msg_ts >= p_start_date
      AND last_msgs.msg_ts <= p_end_date
      -- ✅ NEW: Only count if within 24h window (not abandoned yet)
      AND last_msgs.msg_ts >= NOW() - INTERVAL '24 hours'
  ),
  sales AS (
    SELECT COUNT(DISTINCT cards.id)::bigint AS cnt
    FROM cards
    JOIN stages ON cards.stage_id = stages.id
    WHERE cards.workspace_id = p_workspace_id
      AND LOWER(stages.name) IN ('venda', 'fechado', 'ganho', 'won', 'closed', 'vendido')
      AND cards.updated_at >= p_start_date
      AND cards.updated_at <= p_end_date
  ),
  -- Abandoned: last message from client, within period, AND older than 24 hours
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
      AND last_msgs.msg_ts >= p_start_date
      AND last_msgs.msg_ts <= p_end_date
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