
-- Transferir conexão WhatsApp para o workspace ZigZag
UPDATE whatsapp_numbers 
SET workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
WHERE id = '93009ad2-342f-4899-815c-62db639e242a'
  AND instance_name = 'ws_d28035eec2_36a791ae'
RETURNING id, instance_name, phone_number, workspace_id, status;
