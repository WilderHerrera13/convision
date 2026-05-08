-- Reverse 000041_lab_orders_rbac_and_assignment

-- Drop FK column + index
DROP INDEX IF EXISTS idx_laboratory_orders_assigned_specialist;
ALTER TABLE laboratory_orders DROP COLUMN IF EXISTS assigned_specialist_id;

-- Restore receptionist `laboratory_orders:edit`
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE module = 'laboratory_orders' AND action = 'edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Revoke specialist `laboratory_orders:edit`
DELETE FROM role_permissions
WHERE role_id = 2
  AND permission_id IN (
    SELECT id FROM permissions WHERE module = 'laboratory_orders' AND action = 'edit'
  );

-- Drop assign permission
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE module = 'laboratory_orders' AND action = 'assign'
);
DELETE FROM permissions WHERE module = 'laboratory_orders' AND action = 'assign';
