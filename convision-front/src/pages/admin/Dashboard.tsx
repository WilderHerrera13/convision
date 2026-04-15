import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import AppointmentsSection from '@/components/admin/dashboard/AppointmentsSection';
import { dashboardService, DashboardSummary, RecentOrder } from '@/services/dashboardService';
import { cn } from '@/lib/utils';

const orderStatusConfig: Record<RecentOrder['status'], { bg: string; text: string }> = {
  Listo: { bg: 'bg-convision-success-light', text: 'text-convision-success' },
  'En lab.': { bg: 'bg-convision-warning-light', text: 'text-convision-warning' },
  Cotizado: { bg: 'bg-convision-row-alt', text: 'text-convision-text-secondary' },
};

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatChange = (change: number | null, suffix = '%') => {
  if (change === null) return 'Sin datos anteriores';
  const sign = change >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(change)}${suffix} vs mes anterior`;
};

type MetricCardProps = {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, subColor }) => (
  <div className="bg-white border border-convision-border rounded-[8px] flex flex-col gap-2 px-5 py-4 flex-1">
    <span className="text-[12px] font-medium text-convision-text-secondary">{label}</span>
    <span className="text-[26px] font-semibold text-convision-text leading-none">{value}</span>
    <span className={`text-[12px] ${subColor ?? 'text-convision-text-secondary'}`}>{sub}</span>
  </div>
);

const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white border border-convision-border rounded-[8px] flex flex-col gap-2 px-5 py-4 flex-1 animate-pulse">
    <div className="h-3 bg-convision-border rounded w-24" />
    <div className="h-7 bg-convision-border rounded w-16" />
    <div className="h-3 bg-convision-border rounded w-32" />
  </div>
);

type SalesChartProps = {
  onViewAll: () => void;
  weeklySales: DashboardSummary['weekly_sales'];
  loading: boolean;
};

const SalesChart: React.FC<SalesChartProps> = ({ onViewAll, weeklySales, loading }) => (
  <div className="bg-white border border-convision-border-subtle rounded-[8px] flex flex-col p-5 gap-3 flex-[1_0_0]">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-convision-text">Ventas por semana</span>
      <button onClick={onViewAll} className="text-[11px] text-convision-primary hover:underline">Ver todo →</button>
    </div>
    <div className="flex items-end gap-2 h-[140px] flex-1">
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-end gap-1 flex-1 h-full animate-pulse">
              <div className="w-[56px] rounded-[4px] bg-convision-border" style={{ height: `${40 + Math.random() * 60}px` }} />
              <div className="h-2 w-4 bg-convision-border rounded" />
            </div>
          ))
        : weeklySales.map((bar) => (
            <div key={bar.label} className="flex flex-col items-center justify-end gap-1 flex-1 h-full">
              <div
                className={cn(
                  'w-[56px] rounded-[4px] transition-all',
                  bar.is_current ? 'bg-convision-primary' : 'bg-convision-border',
                )}
                style={{ height: `${Math.max(4, bar.height_pct * 1.32)}px` }}
              />
              <span className={cn(
                'text-[10px] font-normal',
                bar.is_current ? 'text-convision-primary' : 'text-convision-text-muted',
              )}>
                {bar.label}
              </span>
            </div>
          ))}
    </div>
  </div>
);

type RecentOrdersCardProps = {
  onViewAll: () => void;
  orders: RecentOrder[];
  loading: boolean;
};

const RecentOrdersCard: React.FC<RecentOrdersCardProps> = ({ onViewAll, orders, loading }) => (
  <div className="bg-white border border-convision-border-subtle rounded-[8px] flex flex-col w-[380px] shrink-0 shadow-sm">
    <div className="flex items-center justify-between px-5 py-[14px] border-b border-convision-border-subtle">
      <span className="text-[13px] font-semibold text-[#121212]">Pedidos recientes</span>
      <button onClick={onViewAll} className="text-[11px] font-medium text-convision-primary hover:underline">Ver todos →</button>
    </div>
    <div className="bg-convision-row-alt border-b border-convision-border-subtle flex h-9">
      {['Paciente', 'Producto', 'Estado'].map((col, i) => (
        <div key={col} className={`flex items-center px-4 ${i === 0 ? 'flex-[2]' : i === 1 ? 'flex-[2]' : 'flex-[1]'}`}>
          <span className="text-[11px] font-semibold text-convision-text-label">{col}</span>
        </div>
      ))}
    </div>
    {loading ? (
      Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className={cn('flex items-center h-11 border-b border-[#ececef] animate-pulse', idx % 2 === 0 ? 'bg-white' : 'bg-convision-row-alt')}>
          <div className="flex-[2] px-4"><div className="h-3 bg-convision-border rounded w-20" /></div>
          <div className="flex-[2] px-4"><div className="h-3 bg-convision-border rounded w-16" /></div>
          <div className="flex-[1] px-4"><div className="h-4 bg-convision-border rounded-full w-12" /></div>
        </div>
      ))
    ) : orders.length === 0 ? (
      <div className="flex items-center justify-center h-24 text-convision-text-secondary text-sm">Sin pedidos recientes</div>
    ) : (
      orders.map((o, idx) => {
        const sc = orderStatusConfig[o.status] ?? orderStatusConfig['Cotizado'];
        return (
          <div
            key={o.id}
            className={cn('flex items-center h-11 border-b border-[#ececef]', idx % 2 === 0 ? 'bg-white' : 'bg-convision-row-alt')}
          >
            <div className="flex-[2] px-4">
              <span className="text-[12px] font-medium text-[#121212]">{o.patient}</span>
            </div>
            <div className="flex-[2] px-4">
              <span className="text-[12px] text-convision-text-secondary">{o.product}</span>
            </div>
            <div className="flex-[1] px-4">
              <span className={`text-[11px] font-semibold px-2.5 py-[3px] rounded-full ${sc.bg} ${sc.text}`}>
                {o.status}
              </span>
            </div>
          </div>
        );
      })
    )}
    <div className="bg-convision-row-alt border-t border-convision-border-subtle flex items-center justify-center h-10">
      <button onClick={onViewAll} className="text-[12px] font-medium text-convision-primary hover:underline">
        Ver todos los pedidos →
      </button>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const todayLabel = useMemo(
    () => format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
    [],
  );

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const metrics = summary
    ? [
        {
          label: 'Ventas del mes',
          value: formatCurrency(summary.metrics.monthly_sales),
          sub: formatChange(summary.metrics.monthly_sales_change),
          subColor: summary.metrics.monthly_sales_change === null
            ? 'text-convision-text-secondary'
            : summary.metrics.monthly_sales_change >= 0
              ? 'text-convision-success'
              : 'text-convision-error',
        },
        {
          label: 'Pacientes atendidos',
          value: String(summary.metrics.monthly_patients),
          sub: formatChange(summary.metrics.monthly_patients_change),
          subColor: summary.metrics.monthly_patients_change === null
            ? 'text-convision-text-secondary'
            : summary.metrics.monthly_patients_change >= 0
              ? 'text-convision-success'
              : 'text-convision-error',
        },
        {
          label: 'Órdenes laboratorio',
          value: String(summary.metrics.lab_orders_total),
          sub: `${summary.metrics.lab_orders_pending} pendientes entrega`,
          subColor: summary.metrics.lab_orders_pending > 0 ? 'text-convision-warning' : 'text-convision-text-secondary',
        },
        {
          label: 'Cartera pendiente',
          value: formatCurrency(summary.metrics.pending_balance),
          sub: `${summary.metrics.pending_balance_count} con abonos activos`,
          subColor: 'text-convision-text-secondary',
        },
      ]
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-convision-border flex items-center justify-between px-6 h-[56px] shrink-0">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[16px] font-semibold text-[#0f0f12] leading-none">Dashboard general</span>
          <span className="text-[12px] text-convision-text-secondary leading-none capitalize">{todayLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-convision-border-subtle flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] cursor-pointer hover:bg-convision-background transition-colors">
            <span className="text-[13px] text-convision-text">Este mes</span>
            <ChevronRight className="size-3 text-convision-text-secondary rotate-90" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex gap-4 h-[96px]">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
            : metrics.map((m) => <MetricCard key={m.label} {...m} />)}
        </div>

        <div className="flex gap-4">
          <SalesChart
            onViewAll={() => navigate('/admin/sales')}
            weeklySales={summary?.weekly_sales ?? []}
            loading={loading}
          />
          <RecentOrdersCard
            onViewAll={() => navigate('/admin/laboratory-orders')}
            orders={summary?.recent_orders ?? []}
            loading={loading}
          />
        </div>

        <AppointmentsSection basePath="/admin" />
      </div>
    </div>
  );
};

export default Dashboard;
