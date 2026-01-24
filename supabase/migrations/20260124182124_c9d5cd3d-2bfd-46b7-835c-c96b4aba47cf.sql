-- =============================================
-- REPORTS MODULE - Database Functions
-- Functions for analytics/reporting queries
-- =============================================

-- Grant usage on analytics schema to authenticated users
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON analytics.conversation_event_facts TO authenticated;

-- =============================================
-- MESSAGE REPORTS (non-ad) FUNCTIONS
-- =============================================

-- Get Message Report KPIs
CREATE OR REPLACE FUNCTION public.get_message_report_kpis(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  total_messages bigint,
  messages_received bigint,
  messages_sent bigint,
  unique_contacts bigint,
  active_conversations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    COUNT(DISTINCT wa_message_id)::bigint AS total_messages,
    COUNT(DISTINCT wa_message_id) FILTER (WHERE from_me = false)::bigint AS messages_received,
    COUNT(DISTINCT wa_message_id) FILTER (WHERE from_me = true)::bigint AS messages_sent,
    COUNT(DISTINCT remote_jid)::bigint AS unique_contacts,
    COUNT(DISTINCT conversation_id)::bigint AS active_conversations
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = false
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
$$;

-- Get Message Report Timeseries
CREATE OR REPLACE FUNCTION public.get_message_report_timeseries(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  report_date date,
  messages bigint,
  contacts bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    DATE(COALESCE(message_ts, created_at)) AS report_date,
    COUNT(DISTINCT wa_message_id)::bigint AS messages,
    COUNT(DISTINCT remote_jid)::bigint AS contacts
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = false
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
  GROUP BY DATE(COALESCE(message_ts, created_at))
  ORDER BY report_date ASC
$$;

-- Get Message Report Table
CREATE OR REPLACE FUNCTION public.get_message_report_table(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  event_id uuid,
  event_timestamp timestamptz,
  push_name text,
  remote_jid text,
  message_type text,
  status text,
  from_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    event_id,
    COALESCE(message_ts, created_at) AS event_timestamp,
    push_name,
    remote_jid,
    message_type,
    status,
    COALESCE(from_me, false) AS from_me
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = false
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
  ORDER BY COALESCE(message_ts, created_at) DESC
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Get Message Report Count
CREATE OR REPLACE FUNCTION public.get_message_report_count(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT COUNT(*)::bigint
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = false
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
$$;

-- =============================================
-- AD REPORTS FUNCTIONS
-- =============================================

-- Get Ad Report KPIs
CREATE OR REPLACE FUNCTION public.get_ad_report_kpis(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  total_ad_leads bigint,
  ad_messages bigint,
  ad_conversations bigint,
  top_conversion_source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  WITH stats AS (
    SELECT
      COUNT(DISTINCT remote_jid)::bigint AS total_ad_leads,
      COUNT(DISTINCT wa_message_id)::bigint AS ad_messages,
      COUNT(DISTINCT conversation_id)::bigint AS ad_conversations
    FROM analytics.conversation_event_facts
    WHERE workspace_id = p_workspace_id
      AND is_ad_lead = true
      AND COALESCE(message_ts, created_at) >= p_start_date
      AND COALESCE(message_ts, created_at) <= p_end_date
  ),
  top_source AS (
    SELECT conversion_source
    FROM analytics.conversation_event_facts
    WHERE workspace_id = p_workspace_id
      AND is_ad_lead = true
      AND conversion_source IS NOT NULL
      AND COALESCE(message_ts, created_at) >= p_start_date
      AND COALESCE(message_ts, created_at) <= p_end_date
    GROUP BY conversion_source
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    stats.total_ad_leads,
    stats.ad_messages,
    stats.ad_conversations,
    top_source.conversion_source AS top_conversion_source
  FROM stats
  LEFT JOIN top_source ON true
$$;

-- Get Ad Report Timeseries
CREATE OR REPLACE FUNCTION public.get_ad_report_timeseries(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  report_date date,
  leads bigint,
  messages bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    DATE(COALESCE(message_ts, created_at)) AS report_date,
    COUNT(DISTINCT remote_jid)::bigint AS leads,
    COUNT(DISTINCT wa_message_id)::bigint AS messages
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = true
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
  GROUP BY DATE(COALESCE(message_ts, created_at))
  ORDER BY report_date ASC
$$;

-- Get Top Ads
CREATE OR REPLACE FUNCTION public.get_top_ads(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  ad_title text,
  ad_source_id text,
  lead_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    ad_title,
    ad_source_id,
    COUNT(DISTINCT remote_jid)::bigint AS lead_count
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = true
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
    AND (ad_title IS NOT NULL OR ad_source_id IS NOT NULL)
  GROUP BY ad_title, ad_source_id
  ORDER BY lead_count DESC
  LIMIT p_limit
$$;

-- Get Ad Report Table
CREATE OR REPLACE FUNCTION public.get_ad_report_table(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  event_id uuid,
  event_timestamp timestamptz,
  push_name text,
  remote_jid text,
  conversion_source text,
  entry_point_app text,
  entry_point_source text,
  ad_title text,
  ad_source_id text,
  ad_media_type int,
  show_ad_attribution boolean,
  automated_greeting_shown boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT
    event_id,
    COALESCE(message_ts, created_at) AS event_timestamp,
    push_name,
    remote_jid,
    conversion_source,
    entry_point_app,
    entry_point_source,
    ad_title,
    ad_source_id,
    ad_media_type,
    show_ad_attribution,
    automated_greeting_message_shown AS automated_greeting_shown
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = true
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
  ORDER BY COALESCE(message_ts, created_at) DESC
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Get Ad Report Count
CREATE OR REPLACE FUNCTION public.get_ad_report_count(
  p_workspace_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, analytics
AS $$
  SELECT COUNT(*)::bigint
  FROM analytics.conversation_event_facts
  WHERE workspace_id = p_workspace_id
    AND is_ad_lead = true
    AND COALESCE(message_ts, created_at) >= p_start_date
    AND COALESCE(message_ts, created_at) <= p_end_date
$$;