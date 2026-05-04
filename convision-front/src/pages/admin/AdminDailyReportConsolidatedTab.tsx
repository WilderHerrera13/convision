import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import DailyReportDetailView from '@/components/daily-report/DailyReportDetailView';
import DailyReportsFiltersBar from '@/components/admin/DailyReportsFiltersBar';
import dailyActivityReportService, {
  normalizeDailyActivityReport,
  defaultCustomerAttention,
  defaultOperations,
  defaultSocialMedia,
  defaultRecepcionesDinero,
  RECEPCIONES_DINERO_META,
  type DailyActivityReport,
  type CustomerAttention,
  type Operations,
  type SocialMedia,
  type RecepcionesDinero,
} from '@/services/dailyActivityReportService';
import { computeAggregatedPreset, formatRangeYMD } from '@/components/admin/AdminDateRangeBranchBar';
import { userService, type User } from '@/services/userService';

function aggregateReports(reports: DailyActivityReport[]) {
  const ca = defaultCustomerAttention();
  const op = defaultOperations();
  const sm = defaultSocialMedia();
  const rec = defaultRecepcionesDinero();
  const obs: string[] = [];

  for (const r of reports) {
    for (const k of Object.keys(ca) as (keyof CustomerAttention)[]) ca[k] += r.customer_attention[k] ?? 0;
    for (const k of Object.keys(op) as (keyof Operations)[]) op[k] += r.operations[k] ?? 0;
    for (const k of Object.keys(sm) as (keyof SocialMedia)[]) sm[k] += r.social_media[k] ?? 0;
    if (r.recepciones_dinero) {
      for (const { key } of RECEPCIONES_DINERO_META) rec[key] += r.recepciones_dinero[key] ?? 0;
    }
    if (r.observations?.trim()) obs.push(r.observations.trim());
  }
  return { ca, op, sm, rec, obs };
}

function computeKPIs(ca: CustomerAttention, op: Operations, sm: SocialMedia) {
  return {
    atenciones: ca.effective_consultations_men + ca.effective_consultations_women + ca.effective_consultations_children,
    operaciones: op.bonos_entregados + op.bonos_redimidos + op.sistecreditos_realizados + op.addi_realizados + op.otras_ventas + op.plan_separe + op.ordenes,
    redesSociales: sm.publicaciones_fb + sm.publicaciones_ig + sm.mensajes_fb + sm.mensajes_ig,
    bonosEntregados: op.bonos_entregados,
  };
}

const MetricCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="flex flex-col gap-[5px] rounded-[8px] border border-[#e5e5e9] bg-white px-5 py-4">
    <p className="text-[11px] text-[#7d7d87]">{label}</p>
    <p className="text-[24px] font-semibold leading-none text-[#121215]">{value}</p>
  </div>
);

const AdminDailyReportConsolidatedTab: React.FC = () => {
  const defaultRange = computeAggregatedPreset('today');
  const [dateFrom, setDateFrom] = useState<Date>(() => defaultRange.from);
  const [dateTo, setDateTo] = useState<Date>(() => defaultRange.to);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-consolidated', branchFilter],
    queryFn: () => userService.getAll(branchFilter !== 'all' ? branchFilter : undefined),
  });

  useEffect(() => {
    if (selectedUserId === 'all') return;
    const receptionists = users.filter((u) => u.role === 'receptionist');
    if (!receptionists.some((u) => String(u.id) === selectedUserId)) {
      setSelectedUserId('all');
    }
  }, [users, selectedUserId]);

  const handleRangeChange = useCallback((from: Date, to: Date) => {
    setDateFrom(startOfDay(from));
    setDateTo(startOfDay(to));
  }, []);

  const handleBranchChange = useCallback((v: string) => {
    setBranchFilter(v);
    setSelectedUserId('all');
  }, []);

  const dayFromStr = formatRangeYMD(dateFrom);
  const dayToStr = formatRangeYMD(dateTo);

  const { data: reports = [], isFetching } = useQuery({
    queryKey: ['admin-consolidated-reports', dayFromStr, dayToStr, selectedUserId, branchFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: 1,
        per_page: 200,
        date_from: dayFromStr,
        date_to: dayToStr,
        branch_id: branchFilter !== 'all' ? branchFilter : '0',
      };
      if (selectedUserId !== 'all') params.user_id = selectedUserId;
      const resp = await dailyActivityReportService.list(params);
      const raw = (resp as { data?: unknown[] })?.data ?? [];
      return (Array.isArray(raw) ? raw : []).map((r) =>
        normalizeDailyActivityReport(r as Record<string, unknown>),
      );
    },
  });

  const agg = useMemo(() => aggregateReports(reports), [reports]);
  const kpis = useMemo(() => computeKPIs(agg.ca, agg.op, agg.sm), [agg]);

  const syntheticReport = useMemo<DailyActivityReport>(
    () => ({
      id: 0,
      report_date: dayFromStr,
      status: 'pending',
      customer_attention: agg.ca,
      operations: agg.op,
      social_media: agg.sm,
      recepciones_dinero: agg.rec,
      observations: agg.obs.join('\n\n---\n\n'),
      created_at: '',
      updated_at: '',
    }),
    [agg, dayFromStr],
  );

  const hasData = reports.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <DailyReportsFiltersBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onRangeChange={handleRangeChange}
        users={users}
        selectedUserId={selectedUserId}
        onUserChange={setSelectedUserId}
        branchFilter={branchFilter}
        onBranchChange={handleBranchChange}
        statusRight={
          isFetching
            ? 'Cargando…'
            : hasData
              ? `${reports.length} reporte${reports.length !== 1 ? 's' : ''} consolidado${reports.length !== 1 ? 's' : ''}`
              : undefined
        }
      />

      {isFetching && (
        <div className="flex items-center justify-center rounded-[8px] border border-[#e5e5e9] bg-white py-16">
          <p className="text-[12px] text-[#7d7d87]">Cargando consolidado…</p>
        </div>
      )}

      {!isFetching && !hasData && (
        <div className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-[#e0e0e4] bg-white py-20 text-center">
          <p className="text-[14px] font-semibold text-[#0f0f12]">Sin reportes</p>
          <p className="mt-1 text-[12px] text-[#7d7d87]">
            No hay reportes registrados para los filtros seleccionados.
          </p>
        </div>
      )}

      {!isFetching && hasData && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Atenciones del día" value={kpis.atenciones} />
            <MetricCard label="Operaciones totales" value={kpis.operaciones} />
            <MetricCard label="Interacciones redes" value={kpis.redesSociales} />
            <MetricCard label="Bonos entregados" value={kpis.bonosEntregados} />
          </div>

          <div className="rounded-[8px] border border-[#e5e5e9] bg-white px-6 pt-5 pb-4">
            <DailyReportDetailView
              report={syntheticReport}
              role="admin"
              onExportPrint={() => window.print()}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDailyReportConsolidatedTab;
