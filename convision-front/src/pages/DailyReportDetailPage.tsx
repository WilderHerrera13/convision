import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Lock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageLayout from '@/components/layouts/PageLayout';
import DailyReportDetailView from '@/components/daily-report/DailyReportDetailView';
import dailyActivityReportService, {
  normalizeDailyActivityReport,
  type EditLogEntry,
} from '@/services/dailyActivityReportService';

const DailyReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdmin = location.pathname.startsWith('/admin/');
  const backPath = isAdmin ? '/admin/daily-reports' : '/receptionist/daily-report-history';
  const role = isAdmin ? 'admin' : 'receptionist';

  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

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

  const { data: editLogs = [] } = useQuery<EditLogEntry[]>({
    queryKey: ['daily-report-edit-logs', numericId],
    queryFn: () => dailyActivityReportService.getEditLogs(numericId),
    enabled: isAdmin && Number.isFinite(numericId),
  });

  const handleExportPrint = useCallback(() => {
    window.print();
  }, []);

  const handleReopen = async () => {
    if (!numericId) return;
    setIsReopening(true);
    try {
      await dailyActivityReportService.reopen(numericId);
      await queryClient.invalidateQueries({ queryKey: ['daily-activity-report', numericId] });
      await queryClient.invalidateQueries({ queryKey: ['daily-report-edit-logs', numericId] });
      toast({ title: 'Reporte reabierto', description: 'El reporte vuelve a estado pendiente.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo reabrir el reporte.', variant: 'destructive' });
    } finally {
      setIsReopening(false);
      setShowReopenConfirm(false);
    }
  };

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

  const ACTION_LABELS: Record<string, string> = {
    created: 'Reporte creado',
    updated: 'Reporte editado',
    closed: 'Reporte cerrado',
    reopened: 'Reporte reabierto',
  };

  const advisorName = report.user
    ? `${report.user.name} ${report.user.last_name ?? ''}`.trim()
    : 'Asesor';
  const dateLabel = format(new Date(report.report_date + 'T12:00:00'), 'dd/MM/yyyy');
  const isClosed = report.status === 'closed';

  const title = isAdmin ? 'Informes de gestión (asesores)' : 'Detalle del reporte diario';
  const subtitle = isAdmin
    ? `${advisorName} · ${dateLabel}`
    : `Consulta las métricas registradas · ${dateLabel}`;

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      contentClassName="bg-[#f5f5f6]"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {isClosed ? (
            <Badge className="rounded-full border-0 bg-[#ebf5ef] px-3 py-1.5 text-[12px] font-semibold text-[#228b52]">
              <Lock className="mr-1.5 h-3 w-3" />
              Cerrado
            </Badge>
          ) : (
            <Badge className="rounded-full border-0 bg-[#fff6e3] px-3 py-1.5 text-[12px] font-semibold text-[#b57218]">
              Pendiente
            </Badge>
          )}
          {isAdmin && isClosed && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[#dcdce0]"
              onClick={() => setShowReopenConfirm(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 border-[#dcdce0]" asChild>
            <Link to={backPath}>
              <ArrowLeft className="h-4 w-4" />
              Volver al listado
            </Link>
          </Button>
        </div>
      }
    >
      <DailyReportDetailView report={report} role={role} onExportPrint={handleExportPrint} />

      {isAdmin && editLogs.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[#e5e5e9] bg-white">
          <div className="border-b border-[#e5e5e9] px-5 py-3">
            <p className="text-[13px] font-semibold text-[#0f0f12]">Historial de cambios</p>
          </div>
          <ul className="divide-y divide-[#f0f0f2]">
            {editLogs.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-[#0f0f12]">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-[11px] text-[#7d7d87]">
                    por {entry.performed_by?.name ?? `Usuario ${entry.performed_by?.id}`}
                  </span>
                </div>
                <span className="text-[11px] tabular-nums text-[#7d7d87]">
                  {format(new Date(entry.performed_at), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reabrir el reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              El reporte volverá a estado pendiente y el asesor podrá editarlo nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReopening}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={isReopening}>
              Reabrir Reporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default DailyReportDetailPage;
