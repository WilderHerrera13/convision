-- Seed the "rips" permission module (Resolución 2275/2023 admin view) and
-- grant it to Admin — RIPS records are compliance/regulatory data, not
-- exposed to specialist/receptionist/laboratory roles.
--
-- Follows the same pattern as 000041_lab_orders_rbac_and_assignment.up.sql.

INSERT INTO permissions (module, action, description) VALUES
('rips', 'view', 'Ver registros RIPS (Resolución 2275/2023) y adjuntar factura electrónica')
ON CONFLICT (module, action) DO NOTHING;

-- Admin (role_id=1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE module = 'rips' AND action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
