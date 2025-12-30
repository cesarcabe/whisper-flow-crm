-- Tornar whatsapp_number_id nullable em conversations e messages
-- para permitir desconexão de números sem perder histórico

-- 1. Alterar conversations para permitir NULL em whatsapp_number_id
ALTER TABLE public.conversations 
ALTER COLUMN whatsapp_number_id DROP NOT NULL;

-- 2. Alterar messages para manter whatsapp_number_id nullable (já é, mas garantindo)
-- messages.whatsapp_number_id já é nullable, não precisa alterar

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.conversations.whatsapp_number_id IS 'Referência ao número WhatsApp. NULL indica conexão removida/indisponível.';