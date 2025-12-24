-- Add is_group and remote_jid to conversations table for group identification
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS remote_jid text;

-- Create index for remote_jid lookups
CREATE INDEX IF NOT EXISTS idx_conversations_remote_jid ON public.conversations(workspace_id, remote_jid);

-- Add unique constraint for messages external_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_external_id 
ON public.messages(workspace_id, external_id) 
WHERE external_id IS NOT NULL;