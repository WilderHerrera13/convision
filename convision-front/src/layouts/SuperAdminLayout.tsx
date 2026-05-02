import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, Flag, Activity, LogOut, Eye } from 'lucide-react';

type NavItem = { title: string; path: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { label: string | null; items: NavItem[] };

const superAdminNav: NavSection[] = [
  {
    label: null,
    items: [
      { title: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
      { title: 'Ópticas', path: '/super-admin/opticas', icon: Building2 },
    ],
  },
  {
    label: 'CLÍNICA',
    items: [
      { title: 'Feature Flags', path: '/super-admin/feature-flags', icon: Flag },
      { title: 'Actividad', path: '/super-admin/activity', icon: Activity },
    ],
  },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const SuperAdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.name ? getInitials(user.name) : 'SA';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f6]">
      <aside className="bg-[#fcfcfd] border-r border-[#e5e5e9] w-[240px] h-screen flex flex-col shrink-0">
        <div className="bg-white border-b border-[#e5e5e9] h-[60px] flex items-center px-[14px] gap-2 shrink-0">
          <div className="flex items-center gap-[6px]">
            <Eye className="size-5 text-[#3a71f7]" />
            <span className="text-[14px] font-semibold leading-none">
              <span className="text-[#121215]">con</span>
              <span className="text-[#3a71f7]">vision</span>
            </span>
          </div>
          <div className="flex-1" />
          <div className="bg-[#eff1ff] px-2 py-[3px] rounded-full">
            <span className="text-[10px] font-semibold text-[#3a71f7] leading-none">Super Admin</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
          {superAdminNav.map((section, i) => (
            <div key={i}>
              {section.label && (
                <div className="flex items-center h-[26px] px-[10px] pt-2">
                  <span className="text-[9px] font-semibold text-[#b4b5bc] tracking-[1.2px] uppercase leading-none">
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
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-2 h-9 px-[10px] rounded-[6px] text-left transition-colors',
                      isActive
                        ? 'bg-[#eff1ff] text-[#3a71f7]'
                        : 'text-[#7d7d87] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]',
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

        <div className="bg-white border-t border-[#e5e5e9] h-16 flex items-center justify-between px-[14px] shrink-0">
          <div className="flex items-center gap-[10px]">
            <div className="size-[34px] bg-[#eff1ff] rounded-full flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-[#3a71f7] leading-none">{initials}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-semibold text-[#121215] leading-none whitespace-nowrap">
                {user?.name ?? 'Super Admin'}
              </span>
              <span className="text-[11px] text-[#7d7d87] leading-none whitespace-nowrap">Administrador</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1 rounded hover:bg-[#f5f5f5] transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-[14px] text-[#7d7d87]" />
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
