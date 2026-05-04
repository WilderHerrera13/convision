import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageLayout from '@/components/layouts/PageLayout';
import dailyActivityReportService, { normalizeDailyActivityReport } from '@/services/dailyActivityReportService';
import { userService, User } from '@/services/userService';
import { ROLE_LABELS } from '@/pages/admin/dailyReportsUtils';
import { useAdminDailyReportColumns, type DailyReportWithUser } from '@/pages/admin/useAdminDailyReportColumns';
import DailyReportsFiltersBar from '@/components/admin/DailyReportsFiltersBar';
import { computeAggregatedPreset, formatRangeYMD } from '@/components/admin/AdminDateRangeBranchBar';
import AdminDailyReportConsolidatedTab from '@/pages/admin/AdminDailyReportConsolidatedTab';

const AdminDailyReports: React.FC = () => {
  const navigate = useNavigate();

  const defaultRange = computeAggregatedPreset('today');
  const [dateFrom, setDateFrom] = useState<Date>(() => defaultRange.from);
  const [dateTo, setDateTo] = useState<Date>(() => defaultRange.to);
  const [userId, setUserId] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  const roleByUserId = useMemo(() => {
    const m = new Map<number, string>();
    users.forEach((u) => m.set(u.id, ROLE_LABELS[u.role] ?? u.role));
    return m;
  }, [users]);

  const receptionists = useMemo(() => users.filter((u) => u.role === 'receptionist'), [users]);

  useEffect(() => {
    if (users.length === 0 || userId === 'all') return;
    if (!receptionists.some((u) => String(u.id) === userId)) {
      setUserId('all');
    }
  }, [users.length, receptionists, userId]);

  const handleRangeChange = useCallback((from: Date, to: Date) => {
    setDateFrom(startOfDay(from));
    setDateTo(startOfDay(to));
  }, []);

  const openDetail = useCallback(
    (row: DailyReportWithUser) => {
      navigate(`/admin/daily-reports/${row.id}`);
    },
    [navigate],
  );
  const columns = useAdminDailyReportColumns(roleByUserId, openDetail);

  const dayFromStr = formatRangeYMD(dateFrom);
  const dayToStr = formatRangeYMD(dateTo);

  const extraFilters = useMemo(
    () => ({
      date_from: dayFromStr,
      date_to: dayToStr,
      user_id: userId !== 'all' ? userId : undefined,
      branch_id: branchFilter !== 'all' ? branchFilter : '0',
    }),
    [dayFromStr, dayToStr, userId, branchFilter],
  );

  const fetcher = async ({
    page,
    per_page,
    filters,
  }: {
    page: number;
    per_page: number;
    filters?: Record<string, unknown>;
  }) => {
    const f = filters ?? {};
    const params: Record<string, unknown> = {
      page,
      per_page,
      date_from: f.date_from,
      date_to: f.date_to,
    };
    if (f.user_id) params.user_id = f.user_id;
    if (f.branch_id) params.branch_id = f.branch_id;
    const resp = await dailyActivityReportService.list(params);
    const raw = (resp as { data?: unknown[] })?.data ?? [];
    const rows = Array.isArray(raw) ? raw : [];
    const meta = (resp as { meta?: { last_page?: number; total?: number } })?.meta;
    return {
      data: rows.map((r) => normalizeDailyActivityReport(r as Record<string, unknown>)) as DailyReportWithUser[],
      last_page: meta?.last_page ?? (resp as { last_page?: number })?.last_page ?? 1,
      total: meta?.total,
    };
  };

  return (
    <PageLayout
      title="Gestión diaria por asesor"
      subtitle="Consolidado de actividad diaria. Filtra por asesor y fecha para ver el detalle o revisa el historial de reportes."
      subtitleClassName="leading-snug max-w-[600px]"
      titleStackClassName="gap-1.5"
      topbarClassName="min-h-[80px] h-auto shrink-0 items-center py-6"
      contentClassName="bg-[#f5f5f6]"
    >
      <Tabs defaultValue="consolidated" className="flex flex-col gap-0">
        <TabsList className="mb-4 h-[38px] w-fit rounded-[8px] border border-[#e0e0e4] bg-white p-1">
          <TabsTrigger
            value="consolidated"
            className="h-[28px] rounded-[6px] px-4 text-[12px] font-medium data-[state=active]:bg-[#eff1ff] data-[state=active]:font-semibold data-[state=active]:text-[#3a71f7] data-[state=inactive]:text-[#7d7d87]"
          >
            Consolidado
          </TabsTrigger>
          <TabsTrigger
            value="reports-list"
            className="h-[28px] rounded-[6px] px-4 text-[12px] font-medium data-[state=active]:bg-[#eff1ff] data-[state=active]:font-semibold data-[state=active]:text-[#3a71f7] data-[state=inactive]:text-[#7d7d87]"
          >
            Reportes por asesor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consolidated" className="mt-0">
          <AdminDailyReportConsolidatedTab />
        </TabsContent>

        <TabsContent value="reports-list" className="mt-0">
          <div className="flex flex-col gap-[16px]">
            <DailyReportsFiltersBar
              dateFrom={dateFrom}
              dateTo={dateTo}
              onRangeChange={handleRangeChange}
              users={users}
              selectedUserId={userId}
              onUserChange={setUserId}
              branchFilter={branchFilter}
              onBranchChange={setBranchFilter}
            />

            <Card className="w-full overflow-hidden rounded-lg border border-[#e5e5e9] shadow-sm">
              <CardHeader className="space-y-0 border-b border-[#e5e5e9] bg-white px-[15px] py-4">
                <div className="space-y-1.5">
                  <CardTitle className="text-[15px] font-semibold text-[#0f0f12]">Reportes por día</CardTitle>
                  <CardDescription className="max-w-[640px] text-[12px] leading-snug text-[#7d7d87]">
                    Selecciona un reporte para abrir el detalle. Usa los filtros para acotar por asesor, sede y rango de fechas.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-[15px] pb-4 pt-4">
                <EntityTable<DailyReportWithUser>
                  columns={columns}
                  fetcher={fetcher}
                  queryKeyBase="admin-daily-reports"
                  enableSearch={false}
                  showPageSizeSelect={false}
                  initialPerPage={10}
                  extraFilters={extraFilters}
                  tableLayout="ledger"
                  ledgerBorderMode="figma"
                  paginationVariant="figma"
                  tableClassName="table-fixed w-full min-w-[1120px]"
                  tableScrollClassName="max-h-[min(472px,55vh)] overflow-x-auto overflow-y-auto"
                  tableAriaLabel="Reportes del día por asesor; columnas: fecha, asesor, detalle, estado y acción"
                  onRowClick={(row) => navigate(`/admin/daily-reports/${row.id}`)}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AdminDailyReports;
