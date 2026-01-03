-- Remove the overly permissive public SELECT policy from workspace_invitations
-- The accept-invitation edge function already uses adminClient (service role) for queries
-- so this public policy is unnecessary and creates security risks

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.workspace_invitations;