CREATE TABLE IF NOT EXISTS permissions (
    id          BIGSERIAL PRIMARY KEY,
    module      VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action)
);

-- Insert ALL 85+ permission keys (idempotent)
INSERT INTO permissions (module, action, description) VALUES
('patients','view','Ver pacientes') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('patients','create','Crear pacientes') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('patients','edit','Editar pacientes') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('patients','delete','Eliminar pacientes') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('appointments','view','Ver citas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('appointments','create','Crear citas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('appointments','edit','Editar citas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('appointments','delete','Eliminar citas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('prescriptions','view','Ver recetas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('prescriptions','create','Crear recetas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('prescriptions','edit','Editar recetas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('prescriptions','delete','Eliminar recetas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('clinical_histories','view','Ver historias clínicas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('clinical_histories','create','Crear historias clínicas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('clinical_histories','edit','Editar historias clínicas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('sales','view','Ver ventas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('sales','create','Crear ventas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('sales','edit','Editar ventas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('sales','delete','Eliminar ventas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('sales','approve','Aprobar ventas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('quotes','view','Ver cotizaciones') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('quotes','create','Crear cotizaciones') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('quotes','edit','Editar cotizaciones') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('quotes','delete','Eliminar cotizaciones') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('laboratory','view','Ver laboratorios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory','create','Crear laboratorios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory','edit','Editar laboratorios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory','delete','Eliminar laboratorios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory','manage','Gestionar laboratorios') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','view','Ver órdenes de laboratorio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','create','Crear órdenes de laboratorio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','edit','Editar órdenes de laboratorio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','delete','Eliminar órdenes de laboratorio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('laboratory_orders','manage','Gestionar órdenes de laboratorio') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('inventory','view','Ver inventario') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('inventory','create','Crear inventario') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('inventory','edit','Editar inventario') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('inventory','manage','Gestionar inventario') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('products','view','Ver productos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('products','create','Crear productos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('products','edit','Editar productos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('products','delete','Eliminar productos') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('catalog','view','Ver catálogo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('catalog','create','Crear catálogo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('catalog','edit','Editar catálogo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('catalog','delete','Eliminar catálogo') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('warehouses','view','Ver bodegas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('warehouses','create','Crear bodegas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('warehouses','edit','Editar bodegas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('warehouses','delete','Eliminar bodegas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('cash_close','view','Ver cierres de caja') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_close','create','Crear cierres de caja') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_close','approve','Aprobar cierres de caja') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('daily_reports','view','Ver reportes diarios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('daily_reports','create','Crear reportes diarios') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('expenses','view','Ver gastos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('expenses','create','Crear gastos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('expenses','edit','Editar gastos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('expenses','delete','Eliminar gastos') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('purchases','view','Ver compras') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('purchases','create','Crear compras') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('purchases','edit','Editar compras') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('purchases','delete','Eliminar compras') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('suppliers','view','Ver proveedores') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('suppliers','create','Crear proveedores') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('suppliers','edit','Editar proveedores') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('suppliers','delete','Eliminar proveedores') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('payrolls','view','Ver nóminas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('payrolls','create','Crear nóminas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('payrolls','edit','Editar nóminas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('payrolls','delete','Eliminar nóminas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('service_orders','view','Ver órdenes de servicio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('service_orders','create','Crear órdenes de servicio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('service_orders','edit','Editar órdenes de servicio') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('service_orders','delete','Eliminar órdenes de servicio') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('cash_transfers','view','Ver traslados de efectivo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_transfers','create','Crear traslados de efectivo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_transfers','edit','Editar traslados de efectivo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_transfers','delete','Eliminar traslados de efectivo') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('cash_transfers','approve','Aprobar traslados de efectivo') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('orders','view','Ver pedidos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('orders','create','Crear pedidos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('orders','edit','Editar pedidos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('orders','delete','Eliminar pedidos') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('portfolio','view','Ver cartera') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('portfolio','manage','Gestionar cartera') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('discounts','view','Ver descuentos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('discounts','create','Crear descuentos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('discounts','edit','Editar descuentos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('discounts','delete','Eliminar descuentos') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('discounts','approve','Aprobar descuentos') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('management_report','view','Ver reportes de gestión') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('management_report','create','Crear reportes de gestión') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('specialist_reports','view','Ver reportes de especialistas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('specialist_reports','manage','Gestionar reportes de especialistas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('users','view','Ver usuarios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('users','create','Crear usuarios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('users','edit','Editar usuarios') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('users','delete','Eliminar usuarios') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('roles_permissions','manage','Gestionar roles y permisos') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('branches','view','Ver sedes') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('branches','manage','Gestionar sedes') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('reports','view','Ver reportes') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('reports','export','Exportar reportes') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('settings','view','Ver configuración') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('settings','edit','Editar configuración') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('dashboard','view','Ver panel') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('notes','view','Ver notas') ON CONFLICT (module, action) DO NOTHING;
INSERT INTO permissions (module, action, description) VALUES
('notes','create','Crear notas') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('bulk_import','manage','Gestionar carga masiva') ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
('notifications','manage','Gestionar notificaciones') ON CONFLICT (module, action) DO NOTHING;
