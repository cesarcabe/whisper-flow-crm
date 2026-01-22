-- Inserir usuários master na tabela user_roles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('d1f723cc-8219-41cf-b63f-02b7df6cd104', 'master'),  -- cesar@newflow.me
  ('69d7a2c1-851b-42bb-91e7-724280dc06a8', 'master')   -- trafego@newflow.me
ON CONFLICT DO NOTHING;