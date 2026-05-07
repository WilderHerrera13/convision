INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'specialist'
  AND p.module = 'cash_close'
  AND p.action IN ('view', 'create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
