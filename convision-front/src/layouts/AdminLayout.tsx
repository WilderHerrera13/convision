import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, UserRound, CalendarDays, ShoppingCart,
  PackageOpen, FileText, ShoppingBag, FlaskConical, Archive,
  CreditCard, TrendingUp, LogOut, Menu, Eye,
  Wrench, Tag, ArrowLeftRight, Banknote, Users2, Building2,
  ClipboardList, BarChart3,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

type NavItem = { title: string; path: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string | null; items: NavItem[] };

const adminNav: NavSection[] = [
  {
    label: null,
    items: [
      { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { title: 'Reporte de gestión diario', path: '/admin/daily-reports', icon: UserRound },
    ],
  },
  {
    label: 'CLÍNICA',
    items: [
      { title: 'Pacientes', path: '/admin/patients', icon: UserRound },
      { title: 'Citas', path: '/admin/appointments', icon: CalendarDays },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { title: 'Ventas', path: '/admin/sales', icon: ShoppingCart },
      { title: 'Cotizaciones', path: '/admin/quotes', icon: FileText },
      { title: 'Órdenes de Laboratorio', path: '/admin/laboratory-orders', icon: PackageOpen },
      { title: 'Órdenes de Arreglo', path: '/admin/service-orders', icon: Wrench },
      { title: 'Descuentos', path: '/admin/discount-requests', icon: Tag },
    ],
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      { title: 'Compras', path: '/admin/purchases-dashboard', icon: ShoppingBag },
      { title: 'Inventario', path: '/admin/inventory', icon: Archive },
      { title: 'Nómina', path: '/admin/payrolls', icon: CreditCard },
      { title: 'Gastos', path: '/admin/expenses', icon: TrendingUp },
      { title: 'Traslados', path: '/admin/cash-transfers', icon: ArrowLeftRight },
      { title: 'Pagos Proveedores', path: '/admin/supplier-payments', icon: Banknote },
      { title: 'Cierres de Caja', path: '/admin/cash-closes', icon: ClipboardList },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { title: 'Usuarios', path: '/admin/users', icon: Users2 },
      { title: 'Proveedores', path: '/admin/suppliers', icon: Building2 },
      { title: 'Laboratorios', path: '/admin/laboratories', icon: FlaskConical },
    ],
  },
];

const receptionistNav: NavSection[] = [
  { label: null, items: [{ title: 'Dashboard', path: '/receptionist/dashboard', icon: LayoutDashboard }] },
  {
    label: 'CLÍNICA',
    items: [
      { title: 'Pacientes', path: '/receptionist/patients', icon: UserRound },
      { title: 'Citas', path: '/receptionist/appointments', icon: CalendarDays },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { title: 'Ventas', path: '/receptionist/sales', icon: ShoppingCart },
      { title: 'Cotizaciones', path: '/receptionist/quotes', icon: FileText },
      { title: 'Órdenes', path: '/receptionist/orders', icon: PackageOpen },
      { title: 'Descuentos', path: '/receptionist/discount-requests', icon: Tag },
    ],
  },
  {
    label: 'CAJA',
    items: [
      { title: 'Cierre de Caja', path: '/receptionist/cash-closes', icon: ClipboardList },
      { title: 'Historial Cierres', path: '/receptionist/cash-close-history', icon: BarChart3 },
      { title: 'Reporte de gestión diario', path: '/receptionist/daily-report', icon: FileText },
      { title: 'Historial Reportes', path: '/receptionist/daily-report-history', icon: Eye },
    ],
  },
];

const specialistNav: NavSection[] = [
  { label: null, items: [{ title: 'Dashboard', path: '/specialist/dashboard', icon: LayoutDashboard }] },
  { label: 'CLÍNICA', items: [{ title: 'Citas', path: '/specialist/appointments', icon: CalendarDays }] },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const roleLabels: Record<string, { badge: string; title: string }> = {
  admin: { badge: 'Admin', title: 'Administrador' },
  specialist: { badge: 'Especialista', title: 'Especialista' },
  receptionist: { badge: 'Recepción', title: 'Recepcionista' },
};

const roleColors: Record<string, { primary: string; dark: string; light: string }> = {
  admin:        { primary: '#3a71f8', dark: '#2558d4', light: '#eff1ff' },
  specialist:   { primary: '#0f8f64', dark: '#0a6e4d', light: '#e5f8ef' },
  receptionist: { primary: '#8753ef', dark: '#6a3cc4', light: '#f1ebff' },
};

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, toggleSidebar, setOpen, setOpenMobile, isMobile, openMobile } = useSidebar();
  const isCollapsed = isMobile ? !openMobile : state === 'collapsed';

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      if (mql.matches) setOpen(false);
    };
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [setOpen]);

  const path = location.pathname;
  let navSections = adminNav;
  if (user?.role === 'receptionist' || path.startsWith('/receptionist')) navSections = receptionistNav;
  else if (user?.role === 'specialist' || path.startsWith('/specialist')) navSections = specialistNav;

  const roleInfo = roleLabels[user?.role ?? 'admin'] ?? { badge: 'Admin', title: 'Administrador' };
  const initials = user?.name ? getInitials(user.name) : 'US';
  const colors = roleColors[user?.role ?? 'admin'] ?? roleColors.admin;

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-convision-background"
      style={{
        '--role-primary': colors.primary,
        '--role-dark': colors.dark,
        '--role-light': colors.light,
      } as React.CSSProperties}
    >
      {/* Collapsed toggle */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-3 z-[70] bg-white border border-convision-border-subtle rounded-full shadow-sm p-2 hover:bg-convision-background transition-colors"
          aria-label="Expandir sidebar"
        >
          <Menu className="size-4 text-convision-text-secondary" />
        </button>
      )}

      {isMobile && openMobile && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-black/40"
          aria-label="Cerrar menú"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {!isCollapsed && (
        <aside
          className={cn(
            'bg-convision-sidebar border-r border-convision-border w-[240px] h-screen flex flex-col shrink-0 z-40',
            isMobile && 'fixed inset-y-0 left-0 z-[60] shadow-lg',
          )}
        >
          {/* Logo */}
          <div className="bg-white border-b border-convision-border-subtle h-[60px] flex items-center px-[14px] gap-2 shrink-0">
            <div className="flex items-center gap-[6px]">
              <Eye className="size-5 text-convision-primary" />
              <span className="text-[14px] font-semibold leading-none">
                <span className="text-convision-text">con</span>
                <span className="text-convision-primary">vision</span>
              </span>
            </div>
            <div className="flex-1" />
            <button onClick={toggleSidebar} className="p-1 rounded hover:bg-convision-background">
              <Menu className="size-[14px] text-convision-text-secondary" />
            </button>
            <div className="bg-convision-light px-2 py-[3px] rounded-full">
              <span className="text-[10px] font-semibold text-convision-primary leading-none">{roleInfo.badge}</span>
            </div>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
            {navSections.map((section, i) => (
              <div key={i}>
                {section.label && (
                  <div className="flex items-center h-[26px] px-[10px] pt-2">
                    <span className="text-[9px] font-semibold text-convision-text-muted tracking-[1.2px] uppercase leading-none">
                      {section.label}
                    </span>
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) setOpenMobile(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 h-9 px-[10px] rounded-[6px] text-left transition-colors',
                        isActive
                          ? 'bg-convision-light text-convision-primary'
                          : 'text-convision-text-secondary hover:bg-convision-background hover:text-convision-text',
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className={cn('text-[13px] leading-none whitespace-nowrap', isActive ? 'font-semibold' : 'font-normal')}>
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User footer */}
          <div className="bg-white border-t border-convision-border-subtle h-16 flex items-center justify-between px-[14px] shrink-0">
            <div className="flex items-center gap-[10px]">
              <div className="size-[34px] bg-convision-light rounded-full flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-convision-primary leading-none">{initials}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-semibold text-convision-text leading-none whitespace-nowrap">
                  {user?.name ?? 'Usuario'}
                </span>
                <span className="text-[11px] text-convision-text-secondary leading-none whitespace-nowrap">
                  {roleInfo.title}
                </span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1 rounded hover:bg-convision-background transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-[14px] text-convision-text-secondary" />
            </button>
          </div>
        </aside>
      )}

      {/* Main content — no wrapper padding, pages handle their own layout */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden h-screen">
        <AdminTopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
