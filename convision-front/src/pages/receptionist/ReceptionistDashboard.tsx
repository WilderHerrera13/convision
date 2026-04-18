import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsService, type Appointment } from '@/services/appointmentsService';
import { saleService } from '@/services/saleService';
import { useToast } from '@/hooks/use-toast';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { buildReceptionistSalesQueueColumns } from './receptionistDashboardColumns';
import {
  ReceptionistDashboardHeader,
  ReceptionistMetricStrip,
  ReceptionistQuickActionsStrip,
} from './ReceptionistDashboardWidgets';
import { ReceptionistTodayAgendaAside } from './ReceptionistTodayAgendaAside';

const ReceptionistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const dateLabel = useMemo(() => {
    const raw = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
    return `Hoy · ${raw.charAt(0).toUpperCase() + raw.slice(1)}`;
  }, []);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queueNonce, setQueueNonce] = useState(0);
  const [queueTotalCount, setQueueTotalCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayPending, setTodayPending] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesTxCount, setSalesTxCount] = useState(0);

  const columns = useMemo(() => buildReceptionistSalesQueueColumns(navigate), [navigate]);

  type LoadMode = 'initial' | 'silent' | 'manual';

  const loadSummary = useCallback(
    async (mode: LoadMode) => {
      try {
        if (mode === 'initial') setLoadingSummary(true);
        if (mode === 'manual') setIsRefreshing(true);

        const [todayRes, stats, queuePeek] = await Promise.all([
          appointmentsService.getAppointments({
            startDate: todayStr,
            endDate: todayStr,
            perPage: 200,
            sort: 'scheduled_at,asc',
          }),
          saleService.getTodayStats().catch(() => null),
          appointmentsService.getReceptionistSalesQueueTable({ page: 1, per_page: 1 }),
        ]);

        const list = Array.isArray(todayRes.data) ? todayRes.data : [];
        const meta = todayRes.meta as { total?: number | number[] } | undefined;
        let totalFromMeta = list.length;
        if (typeof meta?.total === 'number') totalFromMeta = meta.total;
        else if (Array.isArray(meta?.total) && meta.total.length) totalFromMeta = Number(meta.total[0]);

        const pending = list.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').length;

        setTodayAppointments(list);
        setTodayTotal(totalFromMeta);
        setTodayPending(pending);
        setQueueTotalCount(queuePeek.total ?? 0);

        if (stats) {
          const inner = (stats as { data?: Record<string, unknown> }).data ?? stats;
          const amount = Number(inner.today_amount ?? inner.total_revenue ?? 0);
          const count = Number(inner.today_sales ?? inner.total_sales ?? 0);
          setSalesTotal(amount);
          setSalesTxCount(count);
        } else {
          setSalesTotal(0);
          setSalesTxCount(0);
        }

        if (mode === 'manual') {
          toast({ title: 'Lista actualizada', description: 'Datos del panel actualizados.' });
        }
      } catch (e) {
        console.error(e);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los datos del panel.',
        });
      } finally {
        setLoadingSummary(false);
        setIsRefreshing(false);
      }
    },
    [todayStr, toast],
  );

  useEffect(() => {
    void loadSummary('initial');
  }, [loadSummary]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadSummary('silent');
    }, 30000);
    return () => clearInterval(id);
  }, [loadSummary]);

  const handleRefresh = () => {
    setQueueNonce((n) => n + 1);
    void loadSummary('manual');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-convision-background">
      <ReceptionistDashboardHeader
        userName={user?.name}
        dateLabel={dateLabel}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-1 flex-col gap-4 px-6 py-6">
        <ReceptionistMetricStrip
          loading={loadingSummary}
          todayTotal={todayTotal}
          todayPending={todayPending}
          queueTotal={queueTotalCount}
          salesTotal={salesTotal}
          salesTxCount={salesTxCount}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <EntityTable<Appointment>
              columns={columns}
              queryKeyBase={`receptionist-sales-queue-${queueNonce}`}
              fetcher={({ page, per_page, search }) =>
                appointmentsService.getReceptionistSalesQueueTable({ page, per_page, search })
              }
              searchPlaceholder="Buscar paciente…"
              paginationVariant="figma"
              ledgerBorderMode="figma"
              tableLayout="ledger"
              tableClassName="table-fixed w-full min-w-[680px]"
              enableSorting={false}
              showPageSizeSelect={false}
              initialPerPage={7}
              tableAriaLabel="Cola de ventas"
              tableScrollClassName="max-h-[280px] overflow-y-auto overscroll-contain"
              toolbarLeading={
                <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
                  <span className="text-[14px] font-semibold text-convision-text">Cola de ventas</span>
                  <span className="text-[11px] text-convision-text-secondary">
                    Consultas completadas listas para procesar
                  </span>
                </div>
              }
              onRowClick={(row) => navigate(`/receptionist/appointments/${row.id}`)}
              emptyStateNode={
                <EmptyState
                  variant="default"
                  title="Sin citas en cola"
                  description="No hay consultas completadas pendientes de venta."
                  leadingIcon={ShoppingBag}
                />
              }
            />
            <ReceptionistQuickActionsStrip />
          </div>

          <ReceptionistTodayAgendaAside appointments={todayAppointments} />
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
