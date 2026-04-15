import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import ReceptionistAdvisorCombobox from '@/components/admin/ReceptionistAdvisorCombobox';
import dailyActivityReportService, { normalizeDailyActivityReport } from '@/services/dailyActivityReportService';
import { userService, User } from '@/services/userService';
import { ROLE_LABELS } from '@/pages/admin/dailyReportsUtils';
import { useAdminDailyReportColumns, type DailyReportWithUser } from '@/pages/admin/useAdminDailyReportColumns';

const AdminDailyReports: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [userId, setUserId] = useState<string>('all');

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

  const openDetail = useCallback(
    (row: DailyReportWithUser) => {
      navigate(`/admin/daily-reports/${row.id}`);
    },
    [navigate],
  );
  const columns = useAdminDailyReportColumns(roleByUserId, openDetail);

  const dayStr = format(selectedDate, 'yyyy-MM-dd');
  const extraFilters = useMemo(
    () => ({
      date_from: dayStr,
      date_to: dayStr,
      user_id: userId !== 'all' ? userId : undefined,
    }),
    [dayStr, userId],
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
      title="Consolidado del día"
      subtitle="Comparativa entre asesores. Filtra por fecha y asesor y abre un reporte desde la lista para ver el detalle."
      subtitleClassName="leading-snug max-w-[560px]"
      titleStackClassName="gap-1.5"
      topbarClassName="min-h-[132px] h-auto shrink-0 items-center py-6"
      contentClassName="bg-[#f5f5f6]"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="w-[148px] shrink-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:w-full [&_button]:rounded-[7px] [&_button]:border-[#dcdce0] [&_button]:text-[12px]">
            <DatePicker
              value={selectedDate}
              onChange={(d) => d && setSelectedDate(startOfDay(d))}
              placeholder="Fecha"
            />
          </div>
          <ReceptionistAdvisorCombobox value={userId} onChange={setUserId} users={users} />
        </div>
      }
    >
      <Card className="w-full overflow-hidden rounded-lg border border-[#e5e5e9] shadow-sm">
        <CardHeader className="space-y-0 border-b border-[#e5e5e9] bg-white px-[15px] py-4">
          <div className="space-y-1.5">
            <CardTitle className="text-[15px] font-semibold text-[#0f0f12]">Reportes por día</CardTitle>
            <CardDescription className="max-w-[640px] text-[12px] leading-snug text-[#7d7d87]">
              Selecciona un reporte para abrir el detalle. El filtro por asesor está solo en el encabezado (junto a la
              fecha).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-[15px] pb-4 pt-4">
          <EntityTable<DailyReportWithUser>
            columns={columns}
            fetcher={fetcher}
            queryKeyBase="admin-daily-reports"
            enableSearch={false}
            enableSorting={false}
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
    </PageLayout>
  );
};

export default AdminDailyReports;
