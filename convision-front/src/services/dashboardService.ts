import api from '@/lib/axios';

export type DashboardMetrics = {
  monthly_sales: number;
  monthly_sales_change: number | null;
  monthly_patients: number;
  monthly_patients_change: number | null;
  lab_orders_total: number;
  lab_orders_pending: number;
  pending_balance: number;
  pending_balance_count: number;
};

export type WeeklySaleBar = {
  label: string;
  total: number;
  height_pct: number;
  is_current: boolean;
};

export type RecentOrder = {
  id: number;
  patient: string;
  product: string;
  status: 'Listo' | 'En lab.' | 'Cotizado';
  total: number;
};

export type DashboardSummary = {
  metrics: DashboardMetrics;
  weekly_sales: WeeklySaleBar[];
  recent_orders: RecentOrder[];
};

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await api.get('/api/v1/dashboard/summary');
    return response.data;
  },
};
