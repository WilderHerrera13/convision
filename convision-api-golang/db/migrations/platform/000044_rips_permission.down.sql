-- Reversion for 000044_rips_permission.

DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'rips' AND action = 'view');

DELETE FROM permissions WHERE module = 'rips' AND action = 'view';
