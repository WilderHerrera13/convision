import React, { useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageLayout from '@/components/layouts/PageLayout';
import DailyReportDetailView from '@/components/daily-report/DailyReportDetailView';
import dailyActivityReportService, {
  normalizeDailyActivityReport,
  SHIFT_OPTIONS,
} from '@/services/dailyActivityReportService';

const SHIFT_LABELS: Record<string, string> = Object.fromEntries(
  SHIFT_OPTIONS.map(({ value, label }) => [value, label]),
);

const DailyReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin/');
  const backPath = isAdmin ? '/admin/daily-reports' : '/receptionist/daily-report-history';
  const role = isAdmin ? 'admin' : 'receptionist';

  const numericId = id ? Number.parseInt(id, 10) : NaN;

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['daily-activity-report', numericId],
    queryFn: async () => {
      const raw = await dailyActivityReportService.get(numericId);
      const body = (raw as { data?: Record<string, unknown> })?.data ?? raw;
      return normalizeDailyActivityReport(body as Record<string, unknown>);
    },
    enabled: Number.isFinite(numericId),
  });

  const handleExportPrint = useCallback(() => {
    window.print();
  }, []);

  if (!Number.isFinite(numericId)) {
    return (
      <PageLayout title="Reporte no válido" subtitle="El identificador no es correcto." contentClassName="bg-[#f5f5f6]">
        <Button variant="outline" asChild>
          <Link to={backPath}>Volver al listado</Link>
        </Button>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Cargando…" contentClassName="bg-[#f5f5f6]">
        <p className="text-sm text-muted-foreground">Cargando detalle del reporte…</p>
      </PageLayout>
    );
  }

  if (isError || !report) {
    return (
      <PageLayout title="Error" subtitle="No se pudo cargar el reporte." contentClassName="bg-[#f5f5f6]">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate(backPath)}>
            Volver al listado
          </Button>
        </div>
      </PageLayout>
    );
  }

  const advisorName = report.user
    ? `${report.user.name} ${report.user.last_name ?? ''}`.trim()
    : 'Asesor';
  const dateLabel = format(new Date(report.report_date + 'T12:00:00'), 'dd/MM/yyyy');
  const shiftLabel = SHIFT_LABELS[report.shift] ?? report.shift;

  const title = isAdmin ? 'Informes de gestión (asesores)' : 'Detalle del reporte diario';
  const subtitle = isAdmin
    ? `${advisorName} · ${dateLabel} · Jornada: ${shiftLabel}`
    : `Consulta las métricas registradas · ${dateLabel} · Jornada: ${shiftLabel}`;

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      contentClassName="bg-[#f5f5f6]"
      actions={
        <Button variant="outline" size="sm" className="gap-2 border-[#dcdce0]" asChild>
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4" />
            Volver al listado
          </Link>
        </Button>
      }
    >
      <DailyReportDetailView report={report} role={role} onExportPrint={handleExportPrint} />
    </PageLayout>
  );
};

export default DailyReportDetailPage;
