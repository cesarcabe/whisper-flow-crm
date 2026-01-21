
-- Criar workspace ZigZag
INSERT INTO workspaces (name)
VALUES ('ZigZag')
RETURNING id, name, created_at;
