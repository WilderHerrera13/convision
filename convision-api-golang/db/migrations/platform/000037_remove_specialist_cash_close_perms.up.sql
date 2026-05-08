DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM roles WHERE name IN ('specialist', 'Especialista')
)
  AND permission_id IN (
    SELECT id FROM permissions WHERE module = 'cash_close'
  );

DELETE FROM user_roles
WHERE user_id IN (SELECT id FROM users WHERE role_type = 'specialist')
  AND role_id IN (
    SELECT id FROM roles WHERE name NOT IN ('specialist', 'Especialista')
  );
