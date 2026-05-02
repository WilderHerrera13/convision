import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BranchProvider, useBranch } from '@/contexts/BranchContext';
import SelectBranchPage from '@/pages/SelectBranchPage';
import AdminLayout from '@/layouts/AdminLayout';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import OpticasPage from '@/pages/super-admin/OpticasPage';
import OpticaCreatePage from '@/pages/super-admin/OpticaCreatePage';
import OpticaDetailPage from '@/pages/super-admin/OpticaDetailPage';
import FeatureFlagsPage from '@/pages/super-admin/FeatureFlagsPage';
import Dashboard from '@/pages/admin/Dashboard';
import SpecialistDashboard from '@/pages/specialist/SpecialistDashboard';
import SpecialistAppointmentDetail from '@/pages/specialist/SpecialistAppointmentDetail';
import SpecialistAppointmentsPage from '@/pages/specialist/SpecialistAppointmentsPage';
import SpecialistAppointmentDetailPage from '@/pages/specialist/SpecialistAppointmentDetailPage';
import PrescriptionCreate from '@/pages/specialist/PrescriptionCreate';
import ClinicalHistoryNewConsultationPage from '@/pages/specialist/ClinicalHistoryNewConsultationPage';
import PrescriptionPreviewPage from '@/pages/specialist/PrescriptionPreviewPage';
import ClinicalHistoryFollowUpPage from '@/pages/specialist/ClinicalHistoryFollowUpPage';
import ManagementReport from '@/pages/specialist/ManagementReport';
import ManagementReportDetail from '@/pages/specialist/ManagementReportDetail';
import QualityReview from '@/pages/specialist/QualityReview';
import QualityReviewDetail from '@/pages/specialist/QualityReviewDetail';
import Login from '@/pages/Login';
import PlatformLoginPage from '@/pages/platform/PlatformLoginPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
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
import AppointmentFormPage from './pages/receptionist/AppointmentFormPage';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import AppointmentDetail from './pages/receptionist/AppointmentDetail';
import NewSale from './pages/receptionist/NewSale';
import SalesCatalog from "./pages/receptionist/SalesCatalog";
// Quotes components
import AdminQuotes from "./pages/admin/Quotes";
import ReceptionistQuotes from "./pages/receptionist/Quotes";
import NewQuote from "./pages/receptionist/NewQuote";
import QuoteDetail from "./pages/receptionist/QuoteDetail";

// Add the import for MyDiscountRequests
import DiscountRequests from "./pages/receptionist/DiscountRequests";

// Admin pages
import Users from "./pages/admin/Users";
import UserCreatePage from "./pages/admin/users/UserCreatePage";
import UserEditPage from "./pages/admin/users/UserEditPage";
import UserDetailPage from "./pages/admin/users/UserDetailPage";
import AdminUsersOutlet from "./pages/admin/users/AdminUsersOutlet";
import Inventory from "./pages/admin/Inventory";
import LensCatalogDetailPage from "./pages/admin/inventory/LensCatalogDetailPage";
import Patients from "./pages/admin/Patients";
import Suppliers from "./pages/admin/Suppliers";
import AdminSuppliersOutlet from "./pages/admin/suppliers/AdminSuppliersOutlet";
import SupplierCreatePage from "./pages/admin/suppliers/SupplierCreatePage";
import SupplierEditPage from "./pages/admin/suppliers/SupplierEditPage";
import SupplierDetailPage from "./pages/admin/suppliers/SupplierDetailPage";
import Laboratories from "./pages/admin/Laboratories";
import AdminLaboratoriesOutlet from "./pages/admin/laboratories/AdminLaboratoriesOutlet";
import LaboratoryCreatePage from "./pages/admin/laboratories/LaboratoryCreatePage";
import LaboratoryEditPage from "./pages/admin/laboratories/LaboratoryEditPage";
import LaboratoryDetailPage from "./pages/admin/laboratories/LaboratoryDetailPage";
import ClinicalHistory from "./pages/admin/ClinicalHistory";
import PatientDetail from "./pages/admin/PatientDetail";
import Sales from "./pages/admin/Sales";
import SaleDetail from "./pages/admin/SaleDetail";
import ReceptionistSaleDetail from "./pages/receptionist/SaleDetail";
import ReceptionistSales from "./pages/receptionist/Sales";
import NewPatient from "./pages/receptionist/NewPatient";
import EditPatient from "./pages/receptionist/EditPatient";
import Purchases from "./pages/admin/Purchases";
import NewPurchase from "./pages/admin/NewPurchase";
import PurchaseDetail from "./pages/admin/PurchaseDetail";
import EditPurchase from "./pages/admin/EditPurchase";
import Expenses from "@/pages/admin/Expenses";
import NewExpense from "./pages/admin/NewExpense";

// Cash register close module
import CashRegisterClose from './pages/receptionist/CashRegisterClose';
import CashRegisterHistory from './pages/receptionist/CashRegisterHistory';
import DailyReport from './pages/receptionist/DailyReport';
import DailyQuickAttention from './pages/receptionist/DailyQuickAttention';
import DailyReportHistory from './pages/receptionist/DailyReportHistory';
import DailyReportDetailPage from './pages/DailyReportDetailPage';

// Admin cash close module
import AdminCashCloses from './pages/admin/CashCloses';
import AdminCashCloseDetail from './pages/admin/CashCloseDetail';
import AdminCashClosesByAdvisor from './pages/admin/CashClosesByAdvisor';
import AdminCashCloseCalendar from './pages/admin/CashCloseCalendar';
import AdminCashCloseDetailRedirector from './pages/admin/CashCloseDetailRedirector';
import AdminDailyReports from './pages/admin/DailyReports';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';

// Import the laboratory orders components
import LaboratoryOrders from '@/pages/admin/LaboratoryOrders';
import LaboratoryOrderDetail from '@/pages/admin/LaboratoryOrderDetail';
import NewLaboratoryOrder from '@/pages/admin/NewLaboratoryOrder';
import AdminNotifyClient from '@/pages/admin/AdminNotifyClient';
import WalletManagement from '@/pages/admin/WalletManagement';

// Receptionist lab order pages
import ReceptionistLabOrders from '@/pages/receptionist/LabOrders';
import ReceptionistLabOrderDetail from '@/pages/receptionist/LabOrderDetail';
import ConfirmShipment from '@/pages/receptionist/ConfirmShipment';
import ConfirmReception from '@/pages/receptionist/ConfirmReception';
import AssignDrawer from '@/pages/receptionist/AssignDrawer';
import ConfirmDelivery from '@/pages/receptionist/ConfirmDelivery';
import NotifyClient from '@/pages/receptionist/NotifyClient';

import PortfolioOrderDetail from '@/pages/receptionist/PortfolioOrderDetail';

// Import the purchases dashboard and new modules
import PurchasesDashboard from '@/pages/admin/PurchasesDashboard';
import Payrolls from '@/pages/admin/Payrolls';
import PayrollDetail from '@/pages/admin/PayrollDetail';
import ServiceOrders from '@/pages/admin/ServiceOrders';
import NewServiceOrder from '@/pages/admin/NewServiceOrder';
import ServiceOrderDetail from '@/pages/admin/ServiceOrderDetail';
import EditServiceOrder from '@/pages/admin/EditServiceOrder';
import CashTransfers from '@/pages/admin/CashTransfers';

// Import the new components for missing routes
import NewPayroll from '@/pages/admin/NewPayroll';
import PayrollCalculate from '@/pages/admin/PayrollCalculate';
import SupplierPayments from '@/pages/admin/SupplierPayments';
import SupplierPaymentDetail from '@/pages/admin/SupplierPaymentDetail';
import NewCashTransfer from '@/pages/admin/NewCashTransfer';
import LaboratoryStatus from '@/pages/admin/LaboratoryStatus';
import AdminBranchesOutlet from '@/pages/admin/branches/AdminBranchesOutlet';
import BranchCreatePage from '@/pages/admin/branches/BranchCreatePage';
import BranchEditPage from '@/pages/admin/branches/BranchEditPage';
import BranchDetailPage from '@/pages/admin/branches/BranchDetailPage';
import BranchesPage from '@/pages/admin/BranchesPage';
import SpecialistManagementReport from '@/pages/admin/SpecialistManagementReport';
import SpecialistManagementReportDetalle from '@/pages/admin/SpecialistManagementReportDetail';
import ManagementReportBulkUpload from '@/pages/admin/ManagementReportBulkUpload';
import ImportTypeSelectPage from '@/pages/admin/bulk-import/ImportTypeSelectPage';
import BulkImportPage from '@/pages/admin/bulk-import/BulkImportPage';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
  requireAuth?: boolean;
}> = ({ children, allowedRoles, requireAuth = true }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen variant="auth" />;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const BranchProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, branches } = useAuth();
  const { branchId, setBranch } = useBranch();

  useEffect(() => {
    if (!branchId && user?.role === 'admin' && branches.length > 0) {
      const primary = branches.find((b) => b.is_primary) ?? branches[0];
      setBranch(primary.id, primary.name);
    }
  }, [branchId, user?.role, branches, setBranch]);

  if (isLoading) {
    return <LoadingScreen variant="auth" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!branchId) {
    if (user?.role === 'admin' && branches.length > 0) {
      return <>{children}</>;
    }
    if (user?.role !== 'admin') {
      return <Navigate to="/select-branch" replace />;
    }
    return <Navigate to="/select-branch" replace />;
  }

  return <>{children}</>;
};

const SelectBranchGuard: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <SelectBranchPage />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen variant="auth" />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'super_admin') {
      return <Navigate to="/super-admin/opticas" replace />;
    } else if (user.role === 'admin') {
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
  const { branchId } = useBranch();

  if (isLoading) {
    return <LoadingScreen variant="auth" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && !branchId) {
    return <Navigate to="/select-branch" replace />;
  }

  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin/opticas" replace />;
  } else if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.role === 'specialist') {
    return <Navigate to="/specialist/dashboard" replace />;
  } else if (user?.role === 'receptionist') {
    return <Navigate to="/receptionist/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

const queryClient = new QueryClient();

const RootLayout: React.FC = () => {
  return (
    <BranchProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </BranchProvider>
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
        path: "/change-password",
        element: (
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/select-branch",
        element: (
          <ProtectedRoute>
            <SelectBranchGuard />
          </ProtectedRoute>
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
          <BranchProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </BranchProtectedRoute>
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
            path: "notifications",
            element: <AdminNotificationsPage />,
          },
          {
            path: "users",
            element: <AdminUsersOutlet />,
            children: [
              { index: true, element: <Users /> },
              { path: "new", element: <UserCreatePage /> },
              { path: "create", element: <Navigate to="/admin/users/new" replace /> },
              { path: ":id/edit", element: <UserEditPage /> },
              { path: ":id", element: <UserDetailPage /> },
            ],
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
            path: "patients/:patientId",
            element: <PatientDetail />,
          },
          {
            path: "patients/:patientId/edit",
            element: <EditPatient />,
          },
          {
            path: "patients/:patientId/history",
            element: <ClinicalHistory />,
          },
          {
            path: "suppliers",
            element: <AdminSuppliersOutlet />,
            children: [
              { index: true, element: <Suppliers /> },
              { path: "new", element: <SupplierCreatePage /> },
              { path: ":id/edit", element: <SupplierEditPage /> },
              { path: ":id", element: <SupplierDetailPage /> },
            ],
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
            element: <AdminLaboratoriesOutlet />,
            children: [
              { index: true, element: <Laboratories /> },
              { path: "new", element: <LaboratoryCreatePage /> },
              { path: ":id/edit", element: <LaboratoryEditPage /> },
              { path: ":id", element: <LaboratoryDetailPage /> },
            ],
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
            path: "inventory/lens-catalog/:id",
            element: <LensCatalogDetailPage />,
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
            path: "laboratory-orders/:id",
            element: <LaboratoryOrderDetail />,
          },
          {
            path: "laboratory-orders/:id/notify-client",
            element: <AdminNotifyClient />,
          },
          {
            path: "laboratory-orders/:id/confirm-shipment",
            element: <ConfirmShipment basePath="/admin/laboratory-orders" />,
          },
          {
            path: "laboratory-orders/:id/confirm-reception",
            element: <ConfirmReception basePath="/admin/laboratory-orders" />,
          },
          {
            path: "laboratory-orders/:id/assign-drawer",
            element: <AssignDrawer basePath="/admin/laboratory-orders" />,
          },
          {
            path: "laboratory-orders/:id/confirm-delivery",
            element: <ConfirmDelivery basePath="/admin/laboratory-orders" />,
          },
          {
            path: "laboratory-orders/new",
            element: <NewLaboratoryOrder />,
          },
          {
            path: "portfolio",
            element: <WalletManagement />,
          },
          {
            path: "portfolio/:id",
            element: <PortfolioOrderDetail basePath="/admin/portfolio" />,
          },
          {
            path: "payrolls",
            element: <Payrolls />,
          },
          {
            path: "payrolls/:id",
            element: <PayrollDetail />,
          },
          {
            path: "service-orders",
            element: <ServiceOrders />,
          },
          {
            path: "service-orders/:id",
            element: <ServiceOrderDetail />,
          },
          {
            path: "service-orders/:id/edit",
            element: <EditServiceOrder />,
          },
          {
            path: "service-orders/new",
            element: <NewServiceOrder />,
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
            path: "supplier-payments/:id",
            element: <SupplierPaymentDetail />,
          },
          {
            path: "cash-transfers/new",
            element: <NewCashTransfer />,
          },
          {
            path: "laboratory-status",
            element: <LaboratoryStatus />,
          },
          {
            path: "sedes",
            element: <AdminBranchesOutlet />,
            children: [
              { index: true, element: <BranchesPage /> },
              { path: "new", element: <BranchCreatePage /> },
              { path: ":branchId/edit", element: <BranchEditPage /> },
              { path: ":branchId", element: <BranchDetailPage /> },
            ],
          },
          {
            path: "branches",
            element: <Navigate to="/admin/sedes" replace />,
          },
          {
            path: "cash-closes",
            element: <AdminCashCloses />,
          },
          {
            path: "cash-closes/advisor/:userId",
            element: <AdminCashCloseCalendar />,
          },
          {
            path: "cash-closes-legacy/advisor/:userId",
            element: <AdminCashClosesByAdvisor />,
          },
          {
            path: "cash-closes-legacy/:id",
            element: <AdminCashCloseDetail />,
          },
          {
            path: "cash-closes/:id",
            element: <AdminCashCloseDetailRedirector />,
          },
          {
            path: "daily-reports/quick-attention",
            element: <Navigate to="/admin/daily-reports" replace />,
          },
          {
            path: "daily-reports",
            element: <AdminDailyReports />,
          },
          {
            path: "daily-reports/:id",
            element: <DailyReportDetailPage />,
          },
          {
            path: "management-report",
            element: <ManagementReport />,
          },
          {
            path: "management-report/:id",
            element: <ManagementReportDetail />,
          },
          {
            path: "specialist-reports",
            element: <SpecialistManagementReport />,
          },
          {
            path: "specialist-reports/bulk-upload",
            element: <ManagementReportBulkUpload />,
          },
          {
            path: "bulk-import",
            element: <ImportTypeSelectPage />,
          },
          {
            path: "bulk-import/:type",
            element: <BulkImportPage />,
          },
          {
            path: "specialist-reports/:id",
            element: <SpecialistManagementReportDetalle />,
          },
        ],
      },
      {
        path: "/specialist",
        element: (
          <BranchProtectedRoute allowedRoles={['specialist', 'admin']}>
            <AdminLayout />
          </BranchProtectedRoute>
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
            path: "patients",
            element: <Patients />,
          },
          {
            path: "patients/:patientId/history",
            element: <ClinicalHistory />,
          },
          {
            path: "appointments",
            element: <SpecialistAppointmentsPage />,
          },
          {
            path: "appointments/:id",
            element: <SpecialistAppointmentDetailPage />,
          },
          {
            path: "appointments/:id/clinical-history",
            element: <ClinicalHistoryNewConsultationPage />,
          },
          {
            path: "appointments/:id/prescription-preview",
            element: <PrescriptionPreviewPage />,
          },
          {
            path: "appointments/:id/follow-up",
            element: <ClinicalHistoryFollowUpPage />,
          },
          {
            path: "management-report",
            element: <ManagementReport />,
          },
          {
            path: "management-report/:id",
            element: <ManagementReportDetail />,
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
            path: "laboratory-orders",
            element: <QualityReview />,
          },
          {
            path: "laboratory-orders/:id",
            element: <QualityReviewDetail />,
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
          <BranchProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <AdminLayout />
          </BranchProtectedRoute>
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
            path: "appointments/new",
            element: <AppointmentFormPage />,
          },
          {
            path: "appointments/:id/edit",
            element: <AppointmentFormPage />,
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
            path: "patients/:patientId",
            element: <PatientDetail />,
          },
          {
            path: "patients/:patientId/edit",
            element: <EditPatient />,
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
            element: <ReceptionistSales />,
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
            path: "lab-orders",
            element: <ReceptionistLabOrders />,
          },
          {
            path: "lab-orders/new",
            element: <NewLaboratoryOrder redirectTo="/receptionist/lab-orders" />,
          },
          {
            path: "lab-orders/:id",
            element: <ReceptionistLabOrderDetail />,
          },
          {
            path: "lab-orders/:id/confirm-shipment",
            element: <ConfirmShipment />,
          },
          {
            path: "lab-orders/:id/confirm-reception",
            element: <ConfirmReception />,
          },
          {
            path: "lab-orders/:id/assign-drawer",
            element: <AssignDrawer />,
          },
          {
            path: "lab-orders/:id/confirm-delivery",
            element: <ConfirmDelivery />,
          },
          {
            path: "lab-orders/:id/notify-client",
            element: <NotifyClient />,
          },
          {
            path: "portfolio",
            element: <WalletManagement basePath="/receptionist/portfolio" />,
          },
          {
            path: "portfolio/:id",
            element: <PortfolioOrderDetail basePath="/receptionist/portfolio" />,
          },
          {
            path: "cash-closes",
            element: <CashRegisterClose />,
          },
          {
            path: "cash-close-history",
            element: <CashRegisterHistory />,
          },
          {
            path: "cash-close-detail/:id",
            element: <AdminCashCloseDetail />,
          },
          {
            path: "daily-report",
            element: <DailyReport />,
          },
          {
            path: "daily-report/quick-attention",
            element: <DailyQuickAttention />,
          },
          {
            path: "daily-report-history",
            element: <DailyReportHistory />,
          },
          {
            path: "daily-report-history/:id",
            element: <DailyReportDetailPage />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
        ],
      },
      {
        path: "/platform/login",
        element: <PlatformLoginPage />,
      },
      {
        path: "/super-admin",
        element: (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/super-admin/opticas" replace /> },
          { path: "opticas", element: <OpticasPage /> },
          { path: "opticas/nueva", element: <OpticaCreatePage /> },
          { path: "opticas/:id", element: <OpticaDetailPage /> },
          { path: "feature-flags", element: <FeatureFlagsPage /> },
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