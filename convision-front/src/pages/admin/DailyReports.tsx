import React, { useState } from 'react';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/ui/date-picker';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import PageLayout from '@/components/layouts/PageLayout';
import dailyActivityReportService, { DailyActivityReport, SHIFT_OPTIONS } from '@/services/dailyActivityReportService';
import { userService, User } from '@/services/userService';

interface DailyReportWithUser extends DailyActivityReport {
  user?: { id: number; name: string; last_name: string };
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const SHIFT_BADGE: Record<string, { label: string; className: string }> = {
  morning: { label: 'Mañana', className: 'border-[#3a71f7] bg-[#eff1ff] text-[#3a71f7]' },
  afternoon: { label: 'Tarde', className: 'border-[#b57218] bg-[#fff6e3] text-[#b57218]' },
  full: { label: 'Completa', className: 'border-[#228b52] bg-[#ebf5ef] text-[#228b52]' },
};

const ReportRow: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="flex justify-between py-1 text-sm border-b last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const AdminDailyReports: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [userId, setUserId] = useState<string>('all');
  const [shift, setShift] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<DailyReportWithUser | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  const columns: DataTableColumnDef<DailyReportWithUser>[] = [
    {
      accessorKey: 'report_date',
      header: 'Fecha',
      cell: ({ row }) => format(new Date(row.original.report_date + 'T12:00:00'), 'dd/MM/yyyy'),
    },
    {
      id: 'asesor',
      header: 'Asesor',
      cell: ({ row }) => {
        const u = row.original.user;
        return u ? `${u.name} ${u.last_name}` : '—';
      },
    },
    {
      accessorKey: 'shift',
      header: 'Jornada',
      cell: ({ row }) => {
        const cfg = SHIFT_BADGE[row.original.shift] ?? SHIFT_BADGE.full;
        return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: 'total_questions',
      header: 'Total Preguntas',
      cell: ({ row }) => {
        const ca = row.original.customer_attention;
        return (ca.questions_men ?? 0) + (ca.questions_women ?? 0) + (ca.questions_children ?? 0);
      },
    },
    {
      id: 'effective_consultations',
      header: 'Consultas Efectivas',
      cell: ({ row }) => {
        const ca = row.original.customer_attention;
        return (ca.effective_consultations_men ?? 0) + (ca.effective_consultations_women ?? 0) + (ca.effective_consultations_children ?? 0);
      },
    },
    {
      id: 'valor_ordenes',
      header: 'Valor Órdenes',
      cell: ({ row }) => formatCOP(row.original.operations?.valor_ordenes ?? 0),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="bg-[#eff4ff] border-[#c5d3f8] text-[#3a71f7] hover:bg-blue-100"
          onClick={() => setSelectedReport(row.original)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const extraFilters = {
    date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    user_id: userId !== 'all' ? userId : undefined,
    shift: shift !== 'all' ? shift : undefined,
  };

  const fetcher = async ({ page, per_page }: { page: number; per_page: number }) => {
    const params: Record<string, unknown> = { page, per_page };
    if (extraFilters.date_from) params.date_from = extraFilters.date_from;
    if (extraFilters.date_to) params.date_to = extraFilters.date_to;
    if (extraFilters.user_id) params.user_id = extraFilters.user_id;
    if (extraFilters.shift) params.shift = extraFilters.shift;
    const resp = await dailyActivityReportService.list(params);
    return {
      data: resp?.data ?? (Array.isArray(resp) ? resp : []),
      last_page: resp?.meta?.last_page ?? resp?.last_page ?? 1,
    };
  };

  const shiftLabel = selectedReport ? (SHIFT_BADGE[selectedReport.shift]?.label ?? selectedReport.shift) : '';
  const reportUser = selectedReport?.user ? `${selectedReport.user.name} ${selectedReport.user.last_name}` : 'Asesor';

  return (
    <PageLayout
      title="Reportes Diarios de Gestión"
      subtitle="Reportes de actividad de asesores por jornada"
    >
      <div className="space-y-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Desde</p>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Fecha inicio" />
          </div>
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Hasta</p>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Fecha fin" />
          </div>
          <div className="w-44">
            <p className="text-sm font-medium mb-1">Asesor</p>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} {u.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <p className="text-sm font-medium mb-1">Jornada</p>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SHIFT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || userId !== 'all' || shift !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => { setDateFrom(undefined); setDateTo(undefined); setUserId('all'); setShift('all'); }}
            >
              Limpiar
            </Button>
          )}
        </div>

        <EntityTable<DailyReportWithUser>
          columns={columns}
          fetcher={fetcher}
          queryKeyBase="admin-daily-reports"
          enableSearch={false}
          extraFilters={extraFilters}
        />
      </div>

      <Sheet open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
        <SheetContent className="w-[400px] sm:w-[520px] overflow-y-auto">
          {selectedReport && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>
                  Reporte: {reportUser} — {format(new Date(selectedReport.report_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </SheetTitle>
                <Badge variant="outline" className={SHIFT_BADGE[selectedReport.shift]?.className}>
                  Jornada {shiftLabel}
                </Badge>
              </SheetHeader>

              <div className="space-y-5">
                <div>
                  <p className="font-semibold text-sm mb-2">Atención al Cliente</p>
                  <ReportRow label="Preguntas hombres" value={selectedReport.customer_attention.questions_men} />
                  <ReportRow label="Preguntas mujeres" value={selectedReport.customer_attention.questions_women} />
                  <ReportRow label="Preguntas niños" value={selectedReport.customer_attention.questions_children} />
                  <ReportRow label="Consultas efectivas H" value={selectedReport.customer_attention.effective_consultations_men} />
                  <ReportRow label="Consultas efectivas M" value={selectedReport.customer_attention.effective_consultations_women} />
                  <ReportRow label="Consultas efectivas N" value={selectedReport.customer_attention.effective_consultations_children} />
                </div>

                <div>
                  <p className="font-semibold text-sm mb-2">Operaciones</p>
                  <ReportRow label="Control seguimiento" value={selectedReport.operations.control_seguimiento} />
                  <ReportRow label="Seguimiento garantías" value={selectedReport.operations.seguimiento_garantias} />
                  <ReportRow label="Órdenes" value={selectedReport.operations.ordenes} />
                  <ReportRow label="Plan separe" value={selectedReport.operations.plan_separe} />
                  <ReportRow label="Otras ventas" value={selectedReport.operations.otras_ventas} />
                  <ReportRow label="Entregas" value={selectedReport.operations.entregas} />
                  <ReportRow label="Valor órdenes" value={formatCOP(selectedReport.operations.valor_ordenes)} />
                </div>

                <div>
                  <p className="font-semibold text-sm mb-2">Redes Sociales</p>
                  <ReportRow label="Publicaciones FB" value={selectedReport.social_media.publicaciones_fb} />
                  <ReportRow label="Publicaciones IG" value={selectedReport.social_media.publicaciones_ig} />
                  <ReportRow label="Mensajes FB" value={selectedReport.social_media.mensajes_fb} />
                  <ReportRow label="Mensajes IG" value={selectedReport.social_media.mensajes_ig} />
                  <ReportRow label="Publicaciones WA" value={selectedReport.social_media.publicaciones_wa} />
                  <ReportRow label="TikToks" value={selectedReport.social_media.tiktoks} />
                  <ReportRow label="Bonos regalo" value={selectedReport.social_media.bonos_regalo} />
                  <ReportRow label="Bonos fidelización" value={selectedReport.social_media.bonos_fidelizacion} />
                </div>

                {selectedReport.observations && (
                  <div>
                    <p className="font-semibold text-sm mb-1">Observaciones</p>
                    <p className="text-sm text-muted-foreground">{selectedReport.observations}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
};

export default AdminDailyReports;
