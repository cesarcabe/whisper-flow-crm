-- Limpar dados de uso do CRM mantendo estrutura
-- Ordem respeitando foreign keys

DELETE FROM messages;
DELETE FROM conversation_events;
DELETE FROM cards;
DELETE FROM conversations;
DELETE FROM webhook_deliveries;
DELETE FROM contact_tags;
DELETE FROM segment_members;
DELETE FROM customer_recurrence;
DELETE FROM catalog_sends;
DELETE FROM purchases;
DELETE FROM contacts;