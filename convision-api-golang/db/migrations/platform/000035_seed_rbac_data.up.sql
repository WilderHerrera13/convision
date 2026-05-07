-- ============================================================================
-- Phase 19: Seed RBAC data — system roles + permissions + map existing users
-- ============================================================================

-- 1. Insert the 4 system roles (idempotent with ON CONFLICT)
-- We insert by ID so role_permissions mapping is deterministic.
INSERT INTO roles (id, name, description, is_system, is_default) VALUES
(1, 'Administrador', 'Acceso total al sistema. Puede gestionar usuarios, roles, permisos, y todas las operaciones del negocio.', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_system = TRUE, is_default = TRUE;

INSERT INTO roles (id, name, description, is_system, is_default) VALUES
(2, 'Especialista', 'Acceso a citas, recetas, historias clínicas, órdenes, reportes de gestión y cierres de caja.', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_system = TRUE, is_default = TRUE;

INSERT INTO roles (id, name, description, is_system, is_default) VALUES
(3, 'Recepcionista', 'Acceso a pacientes, ventas, cotizaciones, cartera, compras, gastos, traslados de efectivo y cierres de caja.', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_system = TRUE, is_default = TRUE;

INSERT INTO roles (id, name, description, is_system, is_default) VALUES
(4, 'Laboratorio', 'Acceso a órdenes de laboratorio para cambiar estados y gestionar el flujo de trabajo del laboratorio.', TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_system = TRUE, is_default = TRUE;

-- Advance sequence past our manual inserts
SELECT setval('roles_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM roles), 1), 4));

-- 2. Administrador (role_id=1): ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Especialista (role_id=2): specific permission set
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE (module, action) IN (
    ('patients','view'),
    ('appointments','view'), ('appointments','create'), ('appointments','edit'), ('appointments','delete'),
    ('prescriptions','view'), ('prescriptions','create'), ('prescriptions','edit'),
    ('clinical_histories','view'), ('clinical_histories','create'), ('clinical_histories','edit'),
    ('laboratory_orders','view'),
    ('orders','view'), ('orders','create'), ('orders','edit'),
    ('management_report','view'), ('management_report','create'),
    ('service_orders','view'),
    ('dashboard','view'),
    ('daily_reports','view'), ('daily_reports','create'),
    ('notes','view'), ('notes','create'),
    ('catalog','view'),
    ('products','view'),
    ('laboratory','view'),
    ('discounts','view'),
    ('inventory','view')
) ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Recepcionista (role_id=3): specific permission set
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE (module, action) IN (
    ('patients','view'), ('patients','create'), ('patients','edit'),
    ('appointments','view'), ('appointments','create'), ('appointments','edit'), ('appointments','delete'),
    ('sales','view'), ('sales','create'), ('sales','edit'), ('sales','approve'),
    ('quotes','view'), ('quotes','create'), ('quotes','edit'),
    ('orders','view'), ('orders','create'),
    ('laboratory_orders','view'), ('laboratory_orders','create'), ('laboratory_orders','edit'),
    ('portfolio','view'), ('portfolio','manage'),
    ('suppliers','view'),
    ('purchases','view'), ('purchases','create'), ('purchases','edit'),
    ('expenses','view'), ('expenses','create'), ('expenses','edit'),
    ('cash_transfers','view'), ('cash_transfers','create'), ('cash_transfers','edit'),
    ('cash_close','view'), ('cash_close','create'),
    ('daily_reports','view'), ('daily_reports','create'),
    ('service_orders','view'), ('service_orders','create'), ('service_orders','edit'),
    ('discounts','view'), ('discounts','create'), ('discounts','edit'),
    ('dashboard','view'),
    ('notes','view'), ('notes','create'),
    ('catalog','view'),
    ('products','view'),
    ('laboratory','view'),
    ('inventory','view')
) ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Laboratorio (role_id=4): specific permission set
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE (module, action) IN (
    ('laboratory_orders','view'), ('laboratory_orders','edit'), ('laboratory_orders','manage'),
    ('laboratory','view'),
    ('patients','view'),
    ('catalog','view'),
    ('products','view'),
    ('inventory','view'),
    ('dashboard','view')
) ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 6. Map existing users to system roles by their role_type
-- admin → Administrador (id=1)
INSERT INTO user_roles (user_id, role_id)
SELECT id, 1 FROM users WHERE role_type = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- specialist → Especialista (id=2)
INSERT INTO user_roles (user_id, role_id)
SELECT id, 2 FROM users WHERE role_type = 'specialist'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- receptionist → Recepcionista (id=3)
INSERT INTO user_roles (user_id, role_id)
SELECT id, 3 FROM users WHERE role_type = 'receptionist'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- laboratory → Laboratorio (id=4)
INSERT INTO user_roles (user_id, role_id)
SELECT id, 4 FROM users WHERE role_type = 'laboratory'
ON CONFLICT (user_id, role_id) DO NOTHING;
