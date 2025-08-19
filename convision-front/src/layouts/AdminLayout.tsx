import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  LogOut,
  Menu,
  Glasses,
  User as UserIcon,
  Package,
  ShoppingBag,
  Box,
  Percent,
  DollarSign,
  Building2,
  FileText,
  FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();

  // Admin menu
  const adminMenuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/admin/dashboard',
    },
    {
      title: 'Perfil',
      icon: <UserIcon className="w-5 h-5" />,
      path: '/profile',
    },
    {
      title: 'Usuarios',
      icon: <Users className="w-5 h-5" />,
      path: '/admin/users',
    },
    {
      title: 'Pacientes',
      icon: <UserPlus className="w-5 h-5" />,
      path: '/admin/patients',
    },
    {
      title: 'Proveedores',
      icon: <Box className="w-5 h-5" />,
      path: '/admin/suppliers',
    },
    {
      title: 'Compras',
      icon: <ShoppingBag className="w-5 h-5" />,
      path: '/admin/purchases-dashboard',
    },
    {
      title: 'Laboratorios',
      icon: <Building2 className="w-5 h-5" />,
      path: '/admin/laboratories',
    },
    {
      title: 'Órdenes de Laboratorio',
      icon: <FlaskConical className="w-5 h-5" />,
      path: '/admin/laboratory-orders',
    },
    {
      title: 'Catálogo de Lentes',
      icon: <Glasses className="w-5 h-5" />,
      path: '/admin/catalog',
    },
    {
      title: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      path: '/admin/inventory',
    },
    {
      title: 'Ventas',
      icon: <DollarSign className="w-5 h-5" />,
      path: '/admin/sales',
    },
    {
      title: 'Cotizaciones',
      icon: <FileText className="w-5 h-5" />,
      path: '/admin/quotes',
    },
    {
      title: 'Citas',
      icon: <Calendar className="w-5 h-5" />,
      path: '/admin/appointments',
    },
    {
      title: 'Descuentos',
      icon: <Percent className="w-5 h-5" />,
      path: '/admin/discount-requests',
    },
  ];

  // Receptionist menu
  const receptionistMenuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/receptionist/dashboard',
    },
    {
      title: 'Perfil',
      icon: <UserIcon className="w-5 h-5" />,
      path: '/profile',
    },
    {
      title: 'Pacientes',
      icon: <UserPlus className="w-5 h-5" />,
      path: '/receptionist/patients',
    },
    {
      title: 'Catálogo',
      icon: <Glasses className="w-5 h-5" />,
      path: '/receptionist/catalog',
    },
    {
      title: 'Citas',
      icon: <Calendar className="w-5 h-5" />,
      path: '/receptionist/appointments',
    },
    {
      title: 'Órdenes',
      icon: <ShoppingBag className="w-5 h-5" />,
      path: '/receptionist/orders',
    },
    {
      title: 'Ventas',
      icon: <DollarSign className="w-5 h-5" />,
      path: '/receptionist/sales',
    },
    {
      title: 'Cotizaciones',
      icon: <FileText className="w-5 h-5" />,
      path: '/receptionist/quotes',
    },
    {
      title: 'Descuentos',
      icon: <Percent className="w-5 h-5" />,
      path: '/receptionist/discount-requests',
    },
  ];

  // Specialist menu (add if needed)
  const specialistMenuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/specialist/dashboard',
    },
    {
      title: 'Perfil',
      icon: <UserIcon className="w-5 h-5" />,
      path: '/profile',
    },
    {
      title: 'Citas',
      icon: <Calendar className="w-5 h-5" />,
      path: '/specialist/appointments',
    },
  ];

  // Choose menu based on role
  let menuItems = [];
  
  // If authentication is disabled (no user), default to admin menu for testing
  // You can determine this by checking if we're on an admin route
  const currentPath = location.pathname;
  const isAdminRoute = currentPath.startsWith('/admin');
  const isReceptionistRoute = currentPath.startsWith('/receptionist');
  const isSpecialistRoute = currentPath.startsWith('/specialist');
  
  if (user?.role === 'admin' || (!user && isAdminRoute)) {
    menuItems = adminMenuItems;
  } else if (user?.role === 'receptionist' || (!user && isReceptionistRoute)) {
    menuItems = receptionistMenuItems;
  } else if (user?.role === 'specialist' || (!user && isSpecialistRoute)) {
    menuItems = specialistMenuItems;
  } else {
    // Always default to admin menu if no user (for testing)
    menuItems = adminMenuItems;
  }

  console.log('AdminLayout - Menu selection:', {
    userRole: user?.role,
    currentPath,
    isAdminRoute,
    isReceptionistRoute,
    isSpecialistRoute,
    menuItemsCount: menuItems.length,
    hasUser: !!user
  });

  // Helper to get the correct profile path for the current role
  const getProfilePath = () => {
    if (user?.role === 'admin') return '/admin/profile';
    if (user?.role === 'receptionist') return '/receptionist/profile';
    if (user?.role === 'specialist') return '/specialist/profile';
    
    // If no user (auth disabled), determine from current route
    if (!user) {
      if (isAdminRoute) return '/admin/profile';
      if (isReceptionistRoute) return '/receptionist/profile';
      if (isSpecialistRoute) return '/specialist/profile';
    }
    
    return '/profile';
  };

  const handleLogout = async () => {
    await logout();
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
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      )}
      {/* Sidebar */}
      <Sidebar
        className={cn(
          'h-screen fixed top-0 left-0 z-40',
          'bg-white border-r border-slate-100',
          'w-56 flex flex-col shadow-none'
        )}
        collapsible="offcanvas"
      >
        <div className="flex items-center gap-3 h-20 px-6 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-center bg-transparent rounded-xl p-2">
            <Glasses className="h-7 w-7 text-convision-primary" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-convision-primary">Convision</span>
          <SidebarTrigger className="ml-auto md:hidden" />
        </div>
        <SidebarContent className="flex-1 flex flex-col justify-between">
          <div>
            <SidebarGroup>
              <SidebarGroupLabel>
                <span className="uppercase text-xs tracking-widest text-slate-300 font-semibold pl-2">Menú</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.filter(item => item.path !== '/profile').map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        className={cn(
                          'group flex w-full items-center gap-3 px-5 py-2.5 rounded-lg font-normal transition-all',
                          'text-slate-600 hover:bg-slate-50 hover:text-convision-primary',
                          location.pathname === item.path
                            ? 'bg-slate-50 text-convision-primary font-semibold border-l-2 border-convision-primary shadow-none'
                            : 'border-l-2 border-transparent'
                        )}
                        style={{ marginBottom: 2 }}
                      >
                        <button
                          onClick={() => navigate(item.path)}
                          className="flex w-full items-center gap-3 text-left focus:outline-none"
                        >
                          <span className="flex items-center justify-center w-6 h-6">
                            {item.icon}
                          </span>
                          <span className="truncate text-base font-light tracking-tight">{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
          {/* Special options at the bottom */}
          <div className="mb-4">
            <div className="border-t border-slate-100 my-4" />
            <SidebarMenu>
              {/* Profile option */}
              {menuItems.find(item => item.path === '/profile') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === getProfilePath()}
                    className={cn(
                      'group flex w-full items-center gap-3 px-5 py-2.5 rounded-lg font-normal transition-all',
                      'text-slate-600 hover:bg-slate-50 hover:text-convision-primary',
                      location.pathname === getProfilePath()
                        ? 'bg-slate-50 text-convision-primary font-semibold border-l-2 border-convision-primary shadow-none'
                        : 'border-l-2 border-transparent'
                    )}
                  >
                    <button
                      onClick={() => navigate(getProfilePath())}
                      className="flex w-full items-center gap-3 text-left focus:outline-none"
                    >
                      <span className="flex items-center justify-center w-6 h-6">
                        <UserIcon className="w-5 h-5" />
                      </span>
                      <span className="truncate text-base font-light tracking-tight">Perfil</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Logout option */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-5 py-2.5 text-left text-red-500 bg-transparent hover:bg-red-50 hover:text-red-700 font-semibold transition-all border-l-2 border-transparent hover:border-red-400"
                  >
                    <span className="flex items-center justify-center w-6 h-6">
                      <LogOut className="h-5 w-5" />
                    </span>
                    <span className="truncate text-base font-light tracking-tight">Cerrar Sesión</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarContent>
      </Sidebar>
      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow p-4 min-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout; 