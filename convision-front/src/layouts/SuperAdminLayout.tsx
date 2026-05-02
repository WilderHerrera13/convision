import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Building2, LogOut, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

const SuperAdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f7fa]">
      <SuperAdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const SuperAdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isOpen, toggle } = useSidebar();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#1a1a2e] text-white flex flex-col transition-transform',
          !isOpen && '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-[#2a2a4e]">
          <h1 className="text-lg font-bold">Super Admin</h1>
          <p className="text-sm text-gray-400">{user?.name}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => navigate('/super-admin/opticas')}
            className={cn(
              'flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors',
              isActive('/super-admin/opticas')
                ? 'bg-[#2a2a4e] text-white'
                : 'text-gray-400 hover:bg-[#2a2a4e] hover:text-white'
            )}
          >
            <Building2 className="mr-3 h-4 w-4" />
            Ópticas
          </button>
        </nav>
        <div className="p-4 border-t border-[#2a2a4e]">
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
      {!isOpen && (
        <button
          onClick={toggle}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1a2e] text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
};

export default SuperAdminLayout;
