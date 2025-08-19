import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/layouts/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import SpecialistDashboard from '@/pages/specialist/SpecialistDashboard';
import SpecialistAppointmentDetail from '@/pages/specialist/SpecialistAppointmentDetail';
import PrescriptionCreate from '@/pages/specialist/PrescriptionCreate';
import Login from '@/pages/Login';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from '@/components/ui/sidebar';
import { LoadingScreen } from '@/components/ui/loading-screen';

import Catalog from "./pages/Catalog";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Unauthorized from "./pages/Unauthorized";
import { NotFound } from './pages/ErrorPage';
import Appointments from './pages/receptionist/Appointments';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import AppointmentDetail from './pages/receptionist/AppointmentDetail';
import NewSale from './pages/receptionist/NewSale';
import SalesCatalog from "./pages/receptionist/SalesCatalog";
import OrderList from "./pages/receptionist/OrderList";

// Quotes components
import AdminQuotes from "./pages/admin/Quotes";
import ReceptionistQuotes from "./pages/receptionist/Quotes";
import NewQuote from "./pages/receptionist/NewQuote";
import QuoteDetail from "./pages/receptionist/QuoteDetail";

// Add the import for MyDiscountRequests
import DiscountRequests from "./pages/receptionist/DiscountRequests";

// Admin pages
import Users from "./pages/admin/Users";
import Inventory from "./pages/admin/Inventory";
import Patients from "./pages/admin/Patients";
import Suppliers from "./pages/admin/Suppliers";
import Laboratories from "./pages/admin/Laboratories";
import ClinicalHistory from "./pages/admin/ClinicalHistory";
import Sales from "./pages/admin/Sales";
import SaleDetail from "./pages/admin/SaleDetail";
import ReceptionistSaleDetail from "./pages/receptionist/SaleDetail";
import NewPatient from "./pages/receptionist/NewPatient";
import Purchases from "./pages/admin/Purchases";
import NewPurchase from "./pages/admin/NewPurchase";
import PurchaseDetail from "./pages/admin/PurchaseDetail";
import EditPurchase from "./pages/admin/EditPurchase";
import Expenses from "./pages/admin/Expenses";
import NewExpense from "./pages/admin/NewExpense";

// Import the laboratory orders components
import LaboratoryOrders from '@/pages/admin/LaboratoryOrders';
import NewLaboratoryOrder from '@/pages/admin/NewLaboratoryOrder';

// Import the purchases dashboard and new modules
import PurchasesDashboard from '@/pages/admin/PurchasesDashboard';
import Payrolls from '@/pages/admin/Payrolls';
import ServiceOrders from '@/pages/admin/ServiceOrders';
import CashTransfers from '@/pages/admin/CashTransfers';

// Import the new components for missing routes
import NewPayroll from '@/pages/admin/NewPayroll';
import PayrollCalculate from '@/pages/admin/PayrollCalculate';
import SupplierPayments from '@/pages/admin/SupplierPayments';
import NewCashTransfer from '@/pages/admin/NewCashTransfer';
import LaboratoryStatus from '@/pages/admin/LaboratoryStatus';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
  requireAuth?: boolean;
}> = ({ children, allowedRoles, requireAuth = true }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'specialist') {
      return <Navigate to="/specialist/dashboard" replace />;
    } else if (user.role === 'receptionist') {
      return <Navigate to="/receptionist/dashboard" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const HomePage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.role === 'specialist') {
    return <Navigate to="/specialist/dashboard" replace />;
  } else if (user?.role === 'receptionist') {
    return <Navigate to="/receptionist/dashboard" replace />;
  }

  // If user has an unknown role, redirect to login instead of catalog
  return <Navigate to="/login" replace />;
};

const queryClient = new QueryClient();

const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: "/unauthorized", 
        element: <Unauthorized />,
      },
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/catalog",
        element: (
          <ProtectedRoute>
            <Catalog />
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/settings",
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "users",
            element: <Users />,
          },
          {
            path: "patients",
            element: <Patients />,
          },
          {
            path: "patients/:patientId/history",
            element: <ClinicalHistory />,
          },
          {
            path: "suppliers",
            element: <Suppliers />,
          },
          {
            path: "purchases-dashboard",
            element: <PurchasesDashboard />,
          },
          {
            path: "purchases",
            element: <Purchases />,
          },
          {
            path: "purchases/new",
            element: <NewPurchase />,
          },
          {
            path: "purchases/:id",
            element: <PurchaseDetail />,
          },
          {
            path: "purchases/:id/edit",
            element: <EditPurchase />,
          },
          {
            path: "expenses",
            element: <Expenses />,
          },
          {
            path: "expenses/new",
            element: <NewExpense />,
          },
          {
            path: "laboratories",
            element: <Laboratories />,
          },
          {
            path: "appointments",
            element: <Appointments />,
          },
          {
            path: "appointments/:id",
            element: <SpecialistAppointmentDetail />,
          },
          {
            path: "prescriptions/create",
            element: <PrescriptionCreate />,
          },
          {
            path: "catalog",
            element: <Catalog />,
          },
          {
            path: "inventory",
            element: <Inventory />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "discount-requests",
            element: <DiscountRequests />,
          },
          {
            path: "sales",
            element: <Sales />,
          },
          {
            path: "sales/:id",
            element: <SaleDetail />,
          },
          {
            path: "quotes",
            element: <AdminQuotes />,
          },
          {
            path: "quotes/new",
            element: <NewQuote />,
          },
          {
            path: "quotes/:id",
            element: <QuoteDetail />,
          },
          {
            path: "laboratory-orders",
            element: <LaboratoryOrders />,
          },
          {
            path: "laboratory-orders/new",
            element: <NewLaboratoryOrder />,
          },
          {
            path: "payrolls",
            element: <Payrolls />,
          },
          {
            path: "service-orders",
            element: <ServiceOrders />,
          },
          {
            path: "cash-transfers",
            element: <CashTransfers />,
          },
          {
            path: "payrolls/new",
            element: <NewPayroll />,
          },
          {
            path: "payrolls/calculate",
            element: <PayrollCalculate />,
          },
          {
            path: "supplier-payments",
            element: <SupplierPayments />,
          },
          {
            path: "cash-transfers/new",
            element: <NewCashTransfer />,
          },
          {
            path: "laboratory-status",
            element: <LaboratoryStatus />,
          },
        ],
      },
      {
        path: "/specialist",
        element: (
          <ProtectedRoute allowedRoles={['specialist', 'admin']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/specialist/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <SpecialistDashboard />,
          },
          {
            path: "patients/:patientId/history",
            element: <ClinicalHistory />,
          },
          {
            path: "appointments",
            element: <Appointments />,
          },
          {
            path: "appointments/:id",
            element: <SpecialistAppointmentDetail />,
          },
          {
            path: "prescriptions/create",
            element: <PrescriptionCreate />,
          },
          {
            path: "catalog",
            element: <Catalog />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
        ],
      },
      {
        path: "/receptionist",
        element: (
          <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/receptionist/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <ReceptionistDashboard />,
          },
          {
            path: "patients/:patientId/history",
            element: <ClinicalHistory />,
          },
          {
            path: "appointments",
            element: <Appointments />,
          },
          {
            path: "appointments/:id",
            element: <AppointmentDetail />,
          },
          {
            path: "catalog",
            element: <Catalog />,
          },
          {
            path: "patients",
            element: <Patients />,
          },
          {
            path: "patients/new",
            element: <NewPatient />,
          },
          {
            path: "discount-requests",
            element: <DiscountRequests />,
          },
          {
            path: "quotes",
            element: <ReceptionistQuotes />,
          },
          {
            path: "quotes/new",
            element: <NewQuote />,
          },
          {
            path: "quotes/:id",
            element: <QuoteDetail />,
          },
          {
            path: "sales",
            element: <Sales />,
          },
          {
            path: "sales/catalog",
            element: <SalesCatalog />,
          },
          {
            path: "sales/new",
            element: <NewSale />,
          },
          {
            path: "sales/:id",
            element: <ReceptionistSaleDetail />,
          },
          {
            path: "orders",
            element: <OrderList />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App; 