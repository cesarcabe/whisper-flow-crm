
-- Delete workspace_invitations related to these users
DELETE FROM workspace_invitations 
WHERE email IN ('inv.armandocesar@gmail.com', 'niedja.marquees@gmail.com', 'armandocesar.r@gmail.com');

-- Delete workspace_members for these users
DELETE FROM workspace_members 
WHERE user_id IN (
  '738c62fb-7a1f-4c1d-a283-d51f2595bde2', 
  '315f33db-69cc-4e9a-aa07-3b36e6961f62', 
  '6ebd8be9-9580-40ba-8500-063c30766c54'
);

-- Delete orphaned workspaces (where these users were the only owner)
DELETE FROM workspaces 
WHERE id IN ('28d76eed-d352-4b0e-bf7f-f48a0da0a640', 'ca7a46e3-a465-4c16-979c-ee89a94cc2ab');

-- Delete profiles
DELETE FROM profiles 
WHERE id IN (
  '738c62fb-7a1f-4c1d-a283-d51f2595bde2', 
  '315f33db-69cc-4e9a-aa07-3b36e6961f62', 
  '6ebd8be9-9580-40ba-8500-063c30766c54'
);
