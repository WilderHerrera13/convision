import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Glasses,
  LogOut,
  Menu,
  User,
  Settings,
  PanelLeft
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const [openMobile, setOpenMobile] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
      isActive 
        ? 'bg-convision-primary text-white font-medium' 
        : 'hover:bg-convision-light hover:text-convision-primary'
    );

  const handleMobileMenuToggle = () => {
    setOpenMobile(!openMobile);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Floating Sidebar Toggle Button */}
      {state === 'collapsed' && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-2 z-50 bg-white border border-border rounded-full shadow p-2 hover:bg-gray-100 transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          aria-label="Expand sidebar"
        >
          <PanelLeft className="h-6 w-6 text-gray-700" />
        </button>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          className={cn(
            "h-screen border-r border-border transition-all duration-300"
          )}
          collapsible="offcanvas"
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <Glasses className="h-6 w-6 text-convision-primary" />
              <span className="font-bold text-xl">Convision</span>
            </Link>
          </div>

          <SidebarContent>
            {user?.role === 'admin' && (
              <SidebarGroup>
                <SidebarGroupLabel>
                  Administración
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/admin/dashboard" className={getNavClass({ isActive: isActive('/admin/dashboard') })}>
                          <LayoutDashboard className="h-5 w-5" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/admin/users" className={getNavClass({ isActive: isActive('/admin/users') })}>
                          <Users className="h-5 w-5" />
                          <span>Usuarios</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link to="/admin/catalog" className={getNavClass({ isActive: isActive('/admin/catalog') })}>
                          <Glasses className="h-5 w-5" />
                          <span>Catálogo de Lentes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel>
                Usuario
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/profile" className={getNavClass({ isActive: isActive('/profile') })}>
                        <User className="h-5 w-5" />
                        <span>Mi Perfil</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/settings" className={getNavClass({ isActive: isActive('/settings') })}>
                        <Settings className="h-5 w-5" />
                        <span>Configuración</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button 
                        onClick={handleLogout} 
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-red-100 hover:text-red-600"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleMobileMenuToggle}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-bold text-xl">Convision</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.name}</span>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {openMobile && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-md">
            <div className="p-2">
              {user?.role === 'admin' && (
                <>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 mb-1"
                    onClick={() => {
                      navigate('/admin/dashboard');
                      setOpenMobile(false);
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 mb-1"
                    onClick={() => {
                      navigate('/admin/users');
                      setOpenMobile(false);
                    }}
                  >
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </Button>
                </>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 mb-1"
                onClick={() => {
                  navigate('/admin/catalog');
                  setOpenMobile(false);
                }}
              >
                <Glasses className="h-4 w-4" />
                <span>Catálogo de Lentes</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 mb-1"
                onClick={() => {
                  navigate('/profile');
                  setOpenMobile(false);
                }}
              >
                <User className="h-4 w-4" />
                <span>Mi Perfil</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 mb-1"
                onClick={() => {
                  navigate('/settings');
                  setOpenMobile(false);
                }}
              >
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Top Bar - Desktop */}
        <div className="hidden md:flex h-16 items-center justify-between border-b border-border px-4">
          <div></div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pt-16 md:pt-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
