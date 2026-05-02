import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminBranchFilter } from '@/components/admin/AdminBranchFilter';
import { format, subDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageLayout from '@/components/layouts/PageLayout';
import cashRegisterCloseService, {
  CashCloseCalendarDay,
  CashCloseCalendarPayload,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  DENOMINATIONS,
  type PaymentMethodName,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from './cashClosesConfig';

type DayStatusKind = 'approved' | 'submitted' | 'draft' | 'today' | 'empty';

const STATUS_STYLES: Record<DayStatusKind, { label: string; badge: string; column: string }> = {
  approved: {
    label: 'Aprobado',
    badge: 'bg-[#ebf5ef] text-[#228b52] border border-[#a3d9b8]',
    column: '',
  },
  submitted: {
    label: 'Pendiente',
    badge: 'bg-[#fff6e3] text-[#b57218] border border-[#f4c778]',
    column: 'bg-[#fffaf0]',
  },
  draft: {
    label: 'Borrador',
    badge: 'bg-[#f5f5f7] text-[#7d7d87] border border-[#dcdce0]',
    column: 'bg-[#fafafa]',
  },
  today: {
    label: 'Hoy',
    badge: 'bg-[#eff1ff] text-[#3a71f7] border border-[#c5d3f8]',
    column: 'bg-[#f5f7ff]',
  },
  empty: {
    label: 'Sin cierre',
    badge: 'bg-[#f7f7f8] text-[#b4b5bc] border border-[#e5e5e9]',
    column: 'bg-[#fcfcfd]',
  },
};

function dayStatusKind(day: CashCloseCalendarDay): DayStatusKind {
  if (!day.close) return day.is_today ? 'today' : 'empty';
  if (day.close.status === 'approved') return 'approved';
  if (day.close.status === 'submitted') return 'submitted';
  return 'draft';
}

function formatVariance(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  if (v === 0) return formatCOP(0);
  return `${v > 0 ? '+' : '-'}${formatCOP(Math.abs(v))}`;
}

function varianceTextClass(v: number | null | undefined) {
  if (v === null || v === undefined) return 'text-[#7d7d87]';
  if (v === 0) return 'text-[#0f0f12]';
  return v > 0 ? 'text-[#b82626]' : 'text-[#228b52]';
}

function rowStripe(idx: number) {
  return idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white';
}

const COLUMN_WIDTH = 172;
const LABEL_WIDTH = 220;

const PAYMENT_ROW_METHODS: PaymentMethodName[] = PAYMENT_METHODS.filter(
  (m) => m !== 'efectivo',
) as PaymentMethodName[];

const AdminCashCloseCalendar: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const focusDate = searchParams.get('date');

  const [branchFilter, setBranchFilter] = useState<string>(() => {
    const b =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('branch_id') : null;
    if (!b || b === '0' || b === 'all') return 'all';
    return b;
  });

  const handleBranchFilterChange = (v: string) => {
    setBranchFilter(v);
    const next = new URLSearchParams(searchParams);
    next.set('branch_id', v === 'all' ? '0' : v);
    setSearchParams(next, { replace: true });
  };

  const today = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    if (focusDate) {
      const d = new Date(`${focusDate}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return subDays(d, 6);
    }
    return subDays(today, 7);
  });
  const [dateTo, setDateTo] = useState<Date>(() => {
    if (focusDate) {
      const d = new Date(`${focusDate}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return addDays(d, 6);
    }
    return addDays(today, 6);
  });

  const queryParams = useMemo(
    () => ({
      user_id: Number(userId),
      date_from: format(dateFrom, 'yyyy-MM-dd'),
      date_to: format(dateTo, 'yyyy-MM-dd'),
      branch_id: branchFilter !== 'all' ? branchFilter : '0',
    }),
    [userId, dateFrom, dateTo, branchFilter],
  );

  const { data, isLoading, isFetching, refetch } = useQuery<CashCloseCalendarPayload>({
    queryKey: ['cash-close-calendar', queryParams],
    queryFn: () => cashRegisterCloseService.getCalendarForAdvisor(queryParams),
    enabled: !!userId,
  });

  const [pendingApprove, setPendingApprove] = useState<{ id: number; date: string } | null>(null);
  const [pendingReturn, setPendingReturn] = useState<{ id: number; date: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    if (!pendingApprove) return;
    setActionLoading(true);
    try {
      await cashRegisterCloseService.approve(pendingApprove.id);
      toast.success(`Cierre del ${format(new Date(`${pendingApprove.date}T12:00:00`), 'dd/MM/yyyy')} aprobado`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['advisors-pending-closes'] });
    } catch {
      toast.error('Error al aprobar el cierre');
    } finally {
      setActionLoading(false);
      setPendingApprove(null);
    }
  };

  const handleReturn = async () => {
    if (!pendingReturn) return;
    setActionLoading(true);
    try {
      await cashRegisterCloseService.returnToDraft(pendingReturn.id);
      toast.success('Cierre devuelto al asesor');
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['advisors-pending-closes'] });
    } catch {
      toast.error('Error al devolver el cierre');
    } finally {
      setActionLoading(false);
      setPendingReturn(null);
    }
  };

  const matrixScrollRef = React.useRef<HTMLDivElement | null>(null);
  const todayColumnRef = React.useRef<HTMLDivElement | null>(null);
  const focusColumnRef = React.useRef<HTMLDivElement | null>(null);

  const scrollTargetIntoView = React.useCallback(() => {
    const container = matrixScrollRef.current;
    const target = focusColumnRef.current || todayColumnRef.current;
    if (!container || !target) return;
    const offset =
      target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
  }, []);

  const handleGoToday = () => {
    const freshToday = new Date();
    setDateFrom(subDays(freshToday, 7));
    setDateTo(addDays(freshToday, 6));
    setTimeout(() => scrollTargetIntoView(), 50);
  };

  React.useEffect(() => {
    if (!data) return;
    const t = window.setTimeout(() => scrollTargetIntoView(), 30);
    return () => window.clearTimeout(t);
  }, [data, scrollTargetIntoView]);

  const advisorName = data
    ? `${data.advisor.name} ${data.advisor.last_name ?? ''}`.trim()
    : '';

  const advisorRoleLabel = useMemo(() => {
    const role = data?.advisor.role;
    if (role === 'receptionist') return 'Asesora · Recepción';
    if (role === 'specialist') return 'Especialista';
    return 'Asesor';
  }, [data?.advisor.role]);

  const days = data?.days ?? [];
  const totalRangeDays = days.length;
  const visibleDaysCount = days.filter((d) => d.close !== null || d.is_today).length;
  const summary = data?.summary;

  const avatarInitials = useMemo(() => {
    if (!data) return '??';
    const first = (data.advisor.name || '').charAt(0).toUpperCase();
    const last = (data.advisor.last_name || '').charAt(0).toUpperCase();
    return `${first}${last || ''}` || '??';
  }, [data]);

  return (
    <PageLayout
      title="Cierre de Caja"
      subtitle={advisorName ? `Calendario de Cierres — ${advisorName}` : 'Calendario de Cierres'}
      contentClassName="bg-[#f5f5f6] p-0"
      topbarClassName="min-h-[60px] h-auto py-2"
      titleStackClassName="gap-1"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-[120px] gap-1.5 border-[#e5e5e9] text-[13px] font-semibold text-[#121215]"
          onClick={() => toast.info('Exportación disponible próximamente')}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/admin/cash-closes')}
            className="flex h-10 items-center gap-1.5 rounded-md border border-[#c5d3f8] bg-[#eff1ff] px-3 text-[12px] font-medium text-[#3a71f7] transition-colors hover:bg-[#dce5ff]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </button>
          <div className="flex h-10 items-center gap-2.5 rounded-[10px] border border-[#e5e5e9] bg-white px-3">
            {isLoading && !data ? (
              <>
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="leading-tight flex flex-col gap-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eff1ff] text-[11px] font-semibold text-[#3a71f7]">
                  {avatarInitials}
                </div>
                <div className="leading-tight">
                  <p className="text-[12px] font-semibold text-[#0f0f12]">{advisorName}</p>
                  <p className="text-[10px] text-[#7d7d87]">{advisorRoleLabel}</p>
                </div>
              </>
            )}
          </div>
          <div className="hidden h-6 w-px shrink-0 bg-[#e5e5e9] sm:block" aria-hidden />
          <AdminBranchFilter value={branchFilter} onChange={handleBranchFilterChange} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#7d7d87]">Desde</span>
            <div className="w-[140px]">
              <DatePicker value={dateFrom} onChange={(d) => d && setDateFrom(d)} useInputTrigger />
            </div>
            <span className="ml-1 text-[11px] font-medium text-[#7d7d87]">Hasta</span>
            <div className="w-[140px]">
              <DatePicker value={dateTo} onChange={(d) => d && setDateTo(d)} useInputTrigger />
            </div>
          </div>
          <Badge
            variant="outline"
            className="h-10 rounded-[10px] border-[#e5e5e9] bg-white px-3 text-[11px] font-medium text-[#7d7d87]"
          >
            {visibleDaysCount} de {totalRangeDays} días visibles
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGoToday}
            className="h-10 rounded-[10px] border-[#e5e5e9] px-4 text-[12px] font-semibold text-[#0f0f12]"
          >
            Ir a hoy
          </Button>
        </div>

        {summary && summary.pending_count > 0 && (
          <div className="flex items-center gap-3 rounded-[10px] border border-[#f4c778] bg-[#fff6e3] px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fce0a2] text-[#b57218]">
              <span className="font-bold">{summary.pending_count}</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-[#b57218]">
                {summary.pending_count} cierre{summary.pending_count !== 1 ? 's' : ''} pendiente{summary.pending_count !== 1 ? 's' : ''} de revisión
              </h4>
              <p className="text-[12px] text-[#b57218]/80">
                Revisa el calendario abajo y haz clic en "Aprobar" para procesarlos.
              </p>
            </div>
            <Button
              type="button"
              onClick={scrollTargetIntoView}
              className="ml-auto bg-[#b57218] text-white hover:bg-[#9a6014]"
            >
              Ver pendientes
            </Button>
          </div>
        )}

        <ApprovedResumePanel summary={summary} loading={isLoading} days={days} />

        <CalendarMatrix
          days={days}
          loading={isLoading || isFetching}
          onApprove={(close, date) => setPendingApprove({ id: close.id, date })}
          onReturn={(close, date) => setPendingReturn({ id: close.id, date })}
          scrollRef={matrixScrollRef}
          todayRef={todayColumnRef}
          focusDate={focusDate}
          focusRef={focusColumnRef}
        />
      </div>

      <ConfirmDialog
        open={!!pendingApprove}
        onOpenChange={(open) => !open && setPendingApprove(null)}
        title="Aprobar cierre"
        description={
          pendingApprove
            ? `Confirmas la aprobación del cierre del ${format(new Date(`${pendingApprove.date}T12:00:00`), 'dd/MM/yyyy')}? Una vez aprobado, el total se sumará al resumen del periodo.`
            : ''
        }
        confirmLabel="Aprobar"
        variant="default"
        onConfirm={handleApprove}
        isLoading={actionLoading}
      />

      <ConfirmDialog
        open={!!pendingReturn}
        onOpenChange={(open) => !open && setPendingReturn(null)}
        title="Devolver cierre"
        description={
          pendingReturn
            ? `Se devolverá al asesor el cierre del ${format(new Date(`${pendingReturn.date}T12:00:00`), 'dd/MM/yyyy')} para revisión.`
            : ''
        }
        confirmLabel="Devolver"
        variant="danger"
        onConfirm={handleReturn}
        isLoading={actionLoading}
      />
    </PageLayout>
  );
};

const ApprovedResumePanel: React.FC<{
  summary: CashCloseCalendarPayload['summary'] | undefined;
  loading: boolean;
  days: CashCloseCalendarDay[];
}> = ({ summary, loading, days }) => {
  if (loading && !summary) {
    return <Skeleton className="h-[180px] w-full rounded-[12px]" />;
  }

  const approvedCount = summary?.approved_count ?? 0;
  const pendingCount = summary?.pending_count ?? 0;
  const approvedTotal = summary?.approved_total ?? 0;
  const approvedDays = summary?.approved_days ?? [];
  const hasApproved = approvedDays.length > 0;

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#e5e5e9] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e5e5e9] px-5 py-4">
        <p className="text-[13px] font-semibold text-[#0f0f12]">Resumen de cierres aprobados</p>
        <Badge
          variant="outline"
          className="rounded-full border-[#c5d3f8] bg-[#eff1ff] text-[11px] font-semibold text-[#3a71f7]"
        >
          {approvedCount} aprobado{approvedCount !== 1 ? 's' : ''}
        </Badge>
        {pendingCount > 0 && (
          <Badge
            variant="outline"
            className="rounded-full border-[#f4c778] bg-[#fff6e3] text-[11px] font-semibold text-[#b57218]"
          >
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
        <div className="ml-auto text-right">
          <p className="text-[11px] text-[#7d7d87]">Total aprobado del periodo</p>
          <p className="text-[24px] font-bold leading-none text-[#3a71f7]">
            {formatCOP(approvedTotal)}
          </p>
        </div>
      </div>

      {hasApproved ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#e5e5e9] bg-[#f7f7f8] text-[11px] font-semibold text-[#7d7d87]">
              <tr>
                <th className="px-4 py-2 text-left font-semibold min-w-[40px]">#</th>
                <th className="px-4 py-2 text-left font-semibold min-w-[90px]">Fecha</th>
                <th className="px-4 py-2 text-right font-semibold min-w-[130px]">Total declarado</th>
                <th className="px-4 py-2 text-right font-semibold min-w-[130px]">Efectivo contado</th>
                <th className="px-4 py-2 text-right font-semibold min-w-[150px] whitespace-normal">(−) Sobra (+) Falta</th>
              </tr>
            </thead>
            <tbody>
              {approvedDays.map((day, idx) => {
                const dayInMatrix = days.find((d) => d.date === day.close_date);
                const hasPendingOverride = dayInMatrix?.close?.status === 'submitted';

                return (
                  <tr
                    key={day.id}
                    className={`border-b border-[#f0f0f2] ${idx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
                  >
                    <td className="px-4 py-2 text-[12px] text-[#7d7d87]">{day.index}</td>
                    <td className="px-4 py-2 text-[13px] font-medium text-[#0f0f12]">
                      <div className="flex items-center gap-2">
                        {format(new Date(`${day.close_date}T12:00:00`), 'dd MMM', { locale: es })}
                        {hasPendingOverride && (
                          <Badge variant="outline" className="border-[#f4c778] bg-[#fff6e3] px-1.5 py-0 text-[9px] font-bold text-[#b57218]">
                            NUEVO PENDIENTE
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-right text-[13px] font-medium tabular-nums ${hasPendingOverride ? 'text-[#b4b5bc] line-through' : 'text-[#0f0f12]'}`}>
                      {formatCOP(day.total_counted)}
                    </td>
                    <td className={`px-4 py-2 text-right text-[13px] font-medium tabular-nums ${hasPendingOverride ? 'text-[#b4b5bc] line-through' : 'text-[#0f0f12]'}`}>
                      {day.total_actual_amount != null ? formatCOP(day.total_actual_amount) : '—'}
                    </td>
                    <td className={`px-4 py-2 text-right text-[13px] font-semibold tabular-nums ${hasPendingOverride ? 'text-[#b4b5bc] line-through' : varianceTextClass(day.variance)}`}>
                      {formatVariance(day.variance)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[#3a71f7] bg-[#eff1ff]">
                <td className="px-4 py-2.5 text-[12px] font-bold text-[#3a71f7]">—</td>
                <td className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[#3a71f7]">
                  TOTAL
                </td>
                <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-[#3a71f7]">
                  {formatCOP(summary?.approved_total ?? 0)}
                </td>
                <td className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums text-[#3a71f7]">
                  {summary?.approved_actual_total != null ? formatCOP(summary.approved_actual_total) : '—'}
                </td>
                <td className={`px-4 py-2.5 text-right text-[13px] font-bold tabular-nums ${varianceTextClass(summary?.approved_variance_total)}`}>
                  {formatVariance(summary?.approved_variance_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center px-5 py-8">
          <p className="text-[12px] text-[#7d7d87]">
            Aún no hay cierres aprobados en este periodo. Apruebe cierres enviados desde el calendario para acumularlos aquí.
          </p>
        </div>
      )}
    </div>
  );
};

type CloseSnapshot = CashCloseCalendarDay['close'];

const CalendarMatrix: React.FC<{
  days: CashCloseCalendarDay[];
  loading: boolean;
  onApprove: (close: NonNullable<CloseSnapshot>, date: string) => void;
  onReturn: (close: NonNullable<CloseSnapshot>, date: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  todayRef?: React.RefObject<HTMLDivElement>;
  focusDate?: string | null;
  focusRef?: React.RefObject<HTMLDivElement>;
}> = ({ days, loading, onApprove, onReturn, scrollRef, todayRef, focusDate, focusRef }) => {
  if (loading && days.length === 0) {
    return <Skeleton className="h-[500px] w-full rounded-[12px]" />;
  }

  if (days.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-[12px] border border-[#e5e5e9] bg-white py-16">
        <p className="text-[13px] text-[#7d7d87]">No hay días en el rango seleccionado.</p>
      </div>
    );
  }

  const gridTemplate = {
    gridTemplateColumns: `${LABEL_WIDTH}px repeat(${days.length}, ${COLUMN_WIDTH}px)`,
  } as React.CSSProperties;

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto [overflow-y:visible] rounded-[12px] border border-[#e5e5e9] bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.04)]"
    >
      <div className="min-w-max">
        {/* Header row */}
        <div className="sticky top-0 z-20 grid border-b border-[#e5e5e9] bg-white shadow-[0px_1px_0px_0px_rgba(0,0,0,0.04)]" style={gridTemplate}>
          <div className="sticky left-0 z-30 flex items-end bg-white px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#7d7d87]">
            Concepto \ Fecha
          </div>
          {days.map((day) => {
            const kind = dayStatusKind(day);
            const cfg = STATUS_STYLES[kind];
            const isCurrent = day.is_today;
            const isFocused = day.date === focusDate;
            const isFirstPending = !focusDate && kind === 'submitted' && days.find(d => dayStatusKind(d) === 'submitted') === day;
            const isEmpty = kind === 'empty';
            const shouldRef = isFocused || isFirstPending || (isCurrent && !focusDate && !days.some(d => dayStatusKind(d) === 'submitted'));
            
            return (
              <div
                key={day.date}
                ref={shouldRef ? focusRef || todayRef : undefined}
                className={`relative flex flex-col items-start gap-2 border-l border-[#f0f0f2] px-4 py-4 ${cfg.column} ${isEmpty ? 'opacity-60' : ''} ${isFocused ? 'ring-2 ring-inset ring-[#3a71f7] bg-[#f5f7ff]' : ''}`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[24px] font-bold leading-none ${isCurrent ? 'text-[#3a71f7]' : 'text-[#0f0f12]'}`}>
                    {day.day_number}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-[#7d7d87]">
                    {day.day_name} {day.month_name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cfg.badge}`}
                >
                  {cfg.label}
                </Badge>
                {kind === 'submitted' && day.close && (
                  <div className="mt-0.5 flex w-full items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => day.close && onApprove(day.close, day.date)}
                      className="flex h-6 items-center rounded-[4px] bg-[#228b52] px-2.5 text-[11px] font-semibold text-white shadow-[0px_1px_2px_rgba(34,139,82,0.25)] transition-colors hover:bg-[#1a6e3f]"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => day.close && onReturn(day.close, day.date)}
                      className="flex h-6 items-center rounded-[4px] border border-[#f5baba] bg-[#ffeeed] px-2.5 text-[11px] font-semibold text-[#b82626] transition-colors hover:bg-[#fcdada]"
                    >
                      Devolver
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen section */}
        <SectionHeader label="RESUMEN" columns={days.length} />
        <DataRow
          label="Total declarado (asesor)"
          days={days}
          render={(d) => (d.close ? formatCOP(d.close.total_counted) : '—')}
          idx={0}
        />
        <DataRow
          label="Efectivo contado"
          days={days}
          render={(d) => (d.close ? formatCOP(d.close.cash_counted) : '—')}
          idx={1}
        />
        <DataRow
          label="Diferencia (cierre)"
          days={days}
          render={(d) => {
            if (!d.close) return <span className="text-[#b4b5bc]">—</span>;
            const v = d.close.variance;
            return (
              <span className={`${varianceTextClass(v)} font-medium`}>
                {formatVariance(v)}
              </span>
            );
          }}
          idx={2}
        />
        <DataRow
          label="Estado del cierre"
          days={days}
          idx={3}
          heightClass="py-2"
          render={(d) => {
            const kind = dayStatusKind(d);
            const cfg = STATUS_STYLES[kind];
            return (
              <Badge
                variant="outline"
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}
              >
                {cfg.label}
              </Badge>
            );
          }}
        />

        {/* Denominaciones */}
        <SectionHeader label="DENOMINACIONES (unidades)" columns={days.length} />
        {DENOMINATIONS.map((denom, idx) => (
          <DataRow
            key={denom}
            label={formatCOP(denom)}
            days={days}
            idx={idx}
            render={(d) => {
              if (!d.close) return '—';
              const row = d.close.denominations.find((r) => r.denomination === denom);
              return row && row.quantity > 0 ? row.quantity : <span className="text-[#b4b5bc]">—</span>;
            }}
          />
        ))}

        {/* Medios de pago */}
        <SectionHeader label="MEDIOS DE PAGO" columns={days.length} />
        {PAYMENT_ROW_METHODS.map((method, idx) => (
          <DataRow
            key={method}
            label={PAYMENT_METHOD_LABELS[method]}
            days={days}
            idx={idx}
            render={(d) => {
              if (!d.close) return '—';
              const row = d.close.payment_methods.find((p) => p.name === method);
              const amount = row ? Number(row.counted_amount) : 0;
              return amount > 0 ? formatCOP(amount) : <span className="text-[#b4b5bc]">—</span>;
            }}
          />
        ))}

        {/* Total general */}
        <div className="grid border-t-2 border-[#3a71f7] bg-[#eff1ff]" style={gridTemplate}>
          <div className="sticky left-0 z-10 bg-[#eff1ff] px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-[#3a71f7]">
            TOTAL GENERAL
          </div>
          {days.map((d) => (
            <div
              key={d.date}
              className="border-l border-[#c5d3f8] px-3 py-3 text-right text-[13px] font-bold tabular-nums text-[#3a71f7]"
            >
              {d.close ? formatCOP(d.close.total_counted) : '—'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ label: string; columns: number }> = ({ label, columns }) => (
  <div
    className="grid border-b border-[#e5e5e9] bg-[#f7f7f8]"
    style={{
      gridTemplateColumns: `${LABEL_WIDTH}px repeat(${columns}, ${COLUMN_WIDTH}px)`,
    }}
  >
    <div className="sticky left-0 z-10 bg-[#f7f7f8] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.5px] text-[#7d7d87]">
      {label}
    </div>
    {Array.from({ length: columns }).map((_, i) => (
      <div key={i} className="border-l border-[#f0f0f2]" />
    ))}
  </div>
);

const DataRow: React.FC<{
  label: string;
  days: CashCloseCalendarDay[];
  render: (day: CashCloseCalendarDay) => React.ReactNode;
  idx: number;
  heightClass?: string;
}> = ({ label, days, render, idx, heightClass }) => {
  const stripe = rowStripe(idx);
  const stripeBg = idx % 2 === 1 ? '#fafafa' : '#ffffff';
  return (
    <div
      className={`grid border-b border-[#f0f0f2] ${stripe}`}
      style={{
        gridTemplateColumns: `${LABEL_WIDTH}px repeat(${days.length}, ${COLUMN_WIDTH}px)`,
      }}
    >
      <div
        className={`sticky left-0 z-10 px-4 text-[12px] text-[#0f0f12] ${heightClass ?? 'py-2'} flex items-center`}
        style={{ backgroundColor: stripeBg }}
      >
        {label}
      </div>
      {days.map((d) => {
        const kind = dayStatusKind(d);
        const colBg = STATUS_STYLES[kind].column;
        const muted = kind === 'empty';
        return (
          <div
            key={d.date}
            className={`flex items-center justify-end border-l border-[#f0f0f2] px-3 text-[12px] tabular-nums text-[#0f0f12] ${colBg} ${heightClass ?? 'py-2'} ${muted ? 'text-[#b4b5bc]' : ''}`}
          >
            {render(d)}
          </div>
        );
      })}
    </div>
  );
};

export default AdminCashCloseCalendar;
