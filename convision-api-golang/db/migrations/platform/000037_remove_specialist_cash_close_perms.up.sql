DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'specialist' LIMIT 1)
  AND permission_id IN (
    SELECT id FROM permissions WHERE module = 'cash_close'
  );
