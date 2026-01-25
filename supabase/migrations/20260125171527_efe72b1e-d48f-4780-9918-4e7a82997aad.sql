
-- =========================================
-- MIGRAÇÃO COMPLETA: Estrutura + Backfill
-- =========================================

-- 1) Criar tabela conversation_aliases para unificar PN ↔ LID
CREATE TABLE IF NOT EXISTS conversation_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  whatsapp_number_id uuid NOT NULL REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  alias_remote_jid text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT uq_conversation_aliases_jid 
    UNIQUE(workspace_id, whatsapp_number_id, alias_remote_jid)
);

-- Índice para busca rápida por alias
CREATE INDEX IF NOT EXISTS idx_conversation_aliases_lookup 
  ON conversation_aliases(workspace_id, whatsapp_number_id, alias_remote_jid);

-- 2) RLS para conversation_aliases
ALTER TABLE conversation_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_aliases' AND policyname = 'Workspace members can view aliases') THEN
    CREATE POLICY "Workspace members can view aliases"
      ON conversation_aliases FOR SELECT
      USING (is_workspace_member(auth.uid(), workspace_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_aliases' AND policyname = 'Workspace members can manage aliases') THEN
    CREATE POLICY "Workspace members can manage aliases"
      ON conversation_aliases FOR ALL
      USING (is_workspace_member(auth.uid(), workspace_id));
  END IF;
END $$;

-- 3) Adicionar coluna sender_jid em messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_jid text;

COMMENT ON COLUMN messages.sender_jid IS 
  'JID do autor real da mensagem (participant em grupos, remoteJid em DMs)';

-- 4) BACKFILL: Corrigir contatos com ID de grupo como phone
UPDATE contacts
SET 
  phone = 'group:' || phone || '@g.us',
  notes = COALESCE(notes, '') || E'\n[BACKFILL] Phone corrigido de ID de grupo em ' || NOW()::text
WHERE phone ~ '^120363[0-9]+$'
  AND phone NOT LIKE 'group:%';

-- 5) BACKFILL: Contatos que já têm @g.us no phone  
UPDATE contacts
SET 
  phone = 'group:' || phone,
  notes = COALESCE(notes, '') || E'\n[BACKFILL] Phone corrigido de grupo em ' || NOW()::text
WHERE phone LIKE '%@g.us'
  AND phone NOT LIKE 'group:%';

-- 6) BACKFILL: Popular aliases para conversas existentes com remote_jid
INSERT INTO conversation_aliases (workspace_id, whatsapp_number_id, conversation_id, alias_remote_jid, is_primary)
SELECT 
  c.workspace_id,
  c.whatsapp_number_id,
  c.id,
  c.remote_jid,
  true
FROM conversations c
WHERE c.remote_jid IS NOT NULL
  AND c.whatsapp_number_id IS NOT NULL
ON CONFLICT (workspace_id, whatsapp_number_id, alias_remote_jid) DO NOTHING;

-- 7) Criar índice único parcial em conversations para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_remote_jid 
  ON conversations(workspace_id, whatsapp_number_id, remote_jid) 
  WHERE remote_jid IS NOT NULL;
