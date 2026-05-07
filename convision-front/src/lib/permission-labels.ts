export const MODULE_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  appointments: 'Citas',
  prescriptions: 'Prescripciones',
  clinical_histories: 'Historias clínicas',
  sales: 'Ventas',
  quotes: 'Cotizaciones',
  laboratory: 'Laboratorio',
  laboratory_orders: 'Órdenes de lab.',
  inventory: 'Inventario',
  products: 'Productos',
  catalog: 'Catálogo',
  warehouses: 'Bodegas',
  cash_close: 'Cierre de caja',
  cash_transfers: 'Traslados de caja',
  expenses: 'Gastos',
  purchases: 'Compras',
  payrolls: 'Nómina',
  suppliers: 'Proveedores',
  service_orders: 'Órdenes de arreglo',
  orders: 'Pedidos',
  portfolio: 'Cartera',
  discounts: 'Descuentos',
  users: 'Usuarios',
  roles_permissions: 'Roles y permisos',
  branches: 'Sedes',
  dashboard: 'Dashboard',
  daily_reports: 'Reportes diarios',
  management_report: 'Informe gestión',
  specialist_reports: 'Informes especialista',
  reports: 'Reportes',
  settings: 'Configuración',
  notes: 'Notas',
  bulk_import: 'Carga masiva',
  notifications: 'Notificaciones',
};

export const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  manage: 'Gestionar',
  approve: 'Aprobar',
  export: 'Exportar',
};

export const MODULE_ORDER = Object.keys(MODULE_LABELS);

export function labelModule(mod: string): string {
  return MODULE_LABELS[mod] ?? mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
