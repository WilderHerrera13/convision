-- ============================================================================
-- QA-FIX 2026-05-08-lab-flow:
--   QA-LAB-002 — give Specialist `laboratory_orders:edit` so QA approval works
--   QA-LAB-003 — strip `laboratory_orders:edit` from Receptionist (RBAC inverso)
--   QA-LAB-005/006 — replace [uid:N] tag in notes with FK assigned_specialist_id
--                    + introduce `laboratory_orders:assign` permission
-- ============================================================================

-- 1. New permission for explicit specialist assignment (admin-only by default)
INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','assign','Asignar especialista para revisión de calidad')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Specialist (role_id=2) — grant laboratory_orders:edit (QA approval / return)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE module = 'laboratory_orders' AND action = 'edit'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Receptionist (role_id=3) — revoke laboratory_orders:edit
DELETE FROM role_permissions
WHERE role_id = 3
  AND permission_id IN (
    SELECT id FROM permissions WHERE module = 'laboratory_orders' AND action = 'edit'
  );

-- 4. Admin (role_id=1) auto-grants all permissions, but reassert idempotently
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE module = 'laboratory_orders' AND action = 'assign'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Add assigned_specialist_id FK column to laboratory_orders
ALTER TABLE laboratory_orders
ADD COLUMN IF NOT EXISTS assigned_specialist_id INTEGER NULL
REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_laboratory_orders_assigned_specialist
ON laboratory_orders(assigned_specialist_id)
WHERE assigned_specialist_id IS NOT NULL;

-- 6. Backfill: parse the most recent [uid:N] tag from in_quality status notes
--    into assigned_specialist_id. Idempotent.
UPDATE laboratory_orders lo
SET assigned_specialist_id = sub.user_id
FROM (
    SELECT DISTINCT ON (s.laboratory_order_id)
        s.laboratory_order_id,
        CAST(substring(s.notes FROM '\[uid:(\d+)\]') AS INTEGER) AS user_id
    FROM laboratory_order_statuses s
    WHERE s.status = 'in_quality'
      AND s.notes ~ '\[uid:\d+\]'
    ORDER BY s.laboratory_order_id, s.created_at DESC
) sub
WHERE lo.id = sub.laboratory_order_id
  AND lo.assigned_specialist_id IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = sub.user_id);
