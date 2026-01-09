-- Fix contacts with incorrect name "Dluck Campina Grande"
-- This happened because outgoing messages incorrectly saved pushName (sender's WhatsApp name)
-- Reset these to use phone number as fallback; they will be updated with correct name on next received message

UPDATE contacts
SET 
  name = phone,
  updated_at = now()
WHERE name = 'Dluck Campina Grande';