-- PARTE A: Migrations para classificação de contatos
-- 1) Adicionar colunas de classificação em contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS is_real boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS source_type text NULL,
ADD COLUMN IF NOT EXISTS raw_jid text NULL;

-- Adicionar check para source_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_source_type_check'
  ) THEN
    ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_source_type_check 
    CHECK (source_type IS NULL OR source_type IN ('dm', 'group'));
  END IF;
END $$;

-- 2) Adicionar group_remote_jid em conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS group_remote_jid text NULL;

-- 3) Corrigir constraint de messages.type
-- Primeiro dropar a existente se houver
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check'
  ) THEN
    ALTER TABLE public.messages DROP CONSTRAINT messages_type_check;
  END IF;
END $$;

-- Adicionar constraint mais permissiva
ALTER TABLE public.messages
ADD CONSTRAINT messages_type_check 
CHECK (type IS NULL OR type IN (
  'text', 'image', 'video', 'audio', 'document', 
  'sticker', 'reaction', 'location', 'contact', 
  'vcard', 'unknown', 'ptt'
));

-- Criar índice para consultas otimizadas de contatos visíveis
CREATE INDEX IF NOT EXISTS idx_contacts_visible_real 
ON public.contacts(workspace_id, is_visible, is_real) 
WHERE is_visible = true AND is_real = true;

-- Criar índice para group_remote_jid
CREATE INDEX IF NOT EXISTS idx_conversations_group_remote_jid 
ON public.conversations(workspace_id, group_remote_jid) 
WHERE group_remote_jid IS NOT NULL;

-- PARTE B: Backfill inicial - marcar contatos existentes
-- 1) Marcar contatos com phone válido (8-15 dígitos) como reais
UPDATE public.contacts
SET 
  is_real = true,
  is_visible = true,
  source_type = 'dm'
WHERE 
  phone ~ '^[0-9]{8,15}$'
  AND is_real IS DISTINCT FROM true;

-- 2) Marcar contatos com prefixo "group:" como grupos (visíveis mas não reais leads)
UPDATE public.contacts
SET 
  is_real = false,
  is_visible = false,
  source_type = 'group'
WHERE 
  phone LIKE 'group:%'
  AND source_type IS DISTINCT FROM 'group';

-- 3) Marcar contatos com prefixo "lid:" como placeholders invisíveis
UPDATE public.contacts
SET 
  is_real = false,
  is_visible = false
WHERE 
  phone LIKE 'lid:%'
  AND is_visible IS DISTINCT FROM false;

-- 4) Marcar contatos com phone inválido (>15 dígitos ou não numérico) como invisíveis
UPDATE public.contacts
SET 
  is_real = false,
  is_visible = false,
  notes = COALESCE(notes, '') || E'\n[BACKFILL] Marcado como inválido: phone fora do padrão esperado'
WHERE 
  is_real IS DISTINCT FROM true
  AND phone !~ '^[0-9]{8,15}$'
  AND phone NOT LIKE 'group:%'
  AND phone NOT LIKE 'lid:%';

-- 5) Preencher group_remote_jid em conversations de grupos
UPDATE public.conversations
SET group_remote_jid = remote_jid
WHERE 
  is_group = true 
  AND remote_jid IS NOT NULL
  AND group_remote_jid IS DISTINCT FROM remote_jid;