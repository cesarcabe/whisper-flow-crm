-- Adicionar campos para reply e reações na tabela messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS quoted_message jsonb;

-- Criar tabela de reações
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- RLS para reações
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view reactions"
  ON message_reactions FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage reactions"
  ON message_reactions FOR ALL
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);