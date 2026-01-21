-- Atualizar status da conexão WhatsApp ZigZag para conectado
UPDATE whatsapp_numbers 
SET 
  status = 'connected',
  is_active = true,
  last_connected_at = NOW(),
  updated_at = NOW()
WHERE id = '93009ad2-342f-4899-815c-62db639e242a'
RETURNING id, instance_name, status, is_active;