-- =============================================================
-- Migration: Completar configuração de conversation_aliases
-- Apenas os itens que ainda não foram aplicados
-- =============================================================

-- Verificar e adicionar UNIQUE index em conversations (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_remote_jid 
  ON conversations(workspace_id, whatsapp_number_id, remote_jid) 
  WHERE remote_jid IS NOT NULL;