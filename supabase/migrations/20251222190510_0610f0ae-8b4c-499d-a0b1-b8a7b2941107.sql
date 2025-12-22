
-- Create a test workspace
INSERT INTO public.workspaces (id, name, city, state, created_by)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Workspace Teste',
  'São Paulo',
  'SP',
  '356da28f-ab66-4e49-be6e-9725dfdc0d85'
);

-- Add user as owner of the workspace
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '356da28f-ab66-4e49-be6e-9725dfdc0d85',
  'owner'
);

-- Create default pipeline for the workspace
INSERT INTO public.pipelines (id, name, description, created_by, color, workspace_id)
VALUES (
  gen_random_uuid(),
  'Vendas',
  'Pipeline padrão de vendas',
  '356da28f-ab66-4e49-be6e-9725dfdc0d85',
  '#3B82F6',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
);
