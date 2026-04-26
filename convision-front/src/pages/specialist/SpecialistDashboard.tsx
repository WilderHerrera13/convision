import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsService, type Appointment } from '@/services/appointmentsService';
import { parseLocalDatetime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { buildSpecialistTodayAgendaColumns } from './specialistDashboardColumns';
import {
  SpecialistActiveVisitBanner,
  SpecialistDashboardHeader,
  SpecialistMetricStrip,
  SpecialistPausedStrip,
  SpecialistQuickAccessRow,
} from './SpecialistDashboardWidgets';

type AppointmentRich = Appointment & {
  prescription?: { id: number; recommendation?: string } | null;
};

const SpecialistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeAppointment, setActiveAppointment] = useState<AppointmentRich | null>(null);
  const [pausedAppointments, setPausedAppointments] = useState<AppointmentRich[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentRich[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [stats, setStats] = useState({
    todayCompleted: 0,
    weekScheduled: 0,
    totalPatients: 0,
    pendingPrescriptions: 0,
  });

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const agendaDateLabel = useMemo(() => {
    const raw = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const extraFilters = useMemo(
    () => ({ startDate: todayStr, endDate: todayStr }),
    [todayStr],
  );

  const columns = useMemo(() => buildSpecialistTodayAgendaColumns(navigate), [navigate]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        const appointmentsResponse = await appointmentsService.getAppointments({ perPage: 200 });
        const appointments = (appointmentsResponse.data || []) as AppointmentRich[];
        const uid = user?.id;

        const inProgress = appointments.find(
          (app) =>
            app.status === 'in_progress' &&
            (app.taken_by?.id === uid || app.taken_by_id === uid),
        );
        const paused = appointments.filter(
          (app) => app.status === 'paused' && (app.taken_by?.id === uid || app.taken_by_id === uid),
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const todaysApps = appointments.filter((appointment) => {
          const appDate = parseLocalDatetime(appointment.scheduled_at) ?? new Date(appointment.scheduled_at);
          return appDate >= today && appDate < tomorrow;
        });

        const weekApps = appointments.filter((appointment) => {
          const appDate = parseLocalDatetime(appointment.scheduled_at) ?? new Date(appointment.scheduled_at);
          return appDate >= tomorrow && appDate < nextWeek;
        });

        const todayCompleted = todaysApps.filter((app) => app.status === 'completed').length;
        const pendingPrescriptions = appointments.filter(
          (app) => app.status === 'completed' && !app.prescription,
        ).length;

        setActiveAppointment(inProgress ?? null);
        setPausedAppointments(paused);
        setTodayAppointments(todaysApps);
        setStats({
          todayCompleted,
          weekScheduled: weekApps.length,
          totalPatients: new Set(appointments.map((app) => app.patient.id)).size,
          pendingPrescriptions,
        });
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los datos del panel. Recarga la página.',
        });
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [user, toast]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-convision-background">
      <SpecialistDashboardHeader userName={user?.name} todayCount={todayAppointments.length} />

      <div className="flex flex-1 flex-col gap-6 px-6 py-6">
        {loadingSummary ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-convision-text-secondary">
            <div className="size-8 animate-spin rounded-full border-2 border-convision-border-subtle border-t-convision-primary" />
            <p className="text-sm">Cargando panel…</p>
          </div>
        ) : (
          <>
            <SpecialistMetricStrip
              todayTotal={todayAppointments.length}
              todayCompleted={stats.todayCompleted}
              weekScheduled={stats.weekScheduled}
              totalPatients={stats.totalPatients}
              pendingPrescriptions={stats.pendingPrescriptions}
            />

            {activeAppointment && (
              <SpecialistActiveVisitBanner
                appointment={activeAppointment}
                onGo={() => navigate(`/specialist/appointments/${activeAppointment.id}`)}
              />
            )}

            <SpecialistPausedStrip
              appointments={pausedAppointments}
              onOpen={(id) => navigate(`/specialist/appointments/${id}`)}
            />

            <SpecialistQuickAccessRow />

            <EntityTable<Appointment>
              columns={columns}
              queryKeyBase={`specialist-today-agenda-${todayStr}`}
              extraFilters={extraFilters}
              fetcher={({ page, per_page, search, filters }) =>
                appointmentsService.getSpecialistTodayAgendaTable({
                  page,
                  per_page,
                  search,
                  startDate: String(filters?.startDate ?? todayStr),
                  endDate: String(filters?.endDate ?? todayStr),
                })
              }
              searchPlaceholder="Buscar cita..."
              paginationVariant="figma"
              ledgerBorderMode="figma"
              tableLayout="ledger"
              tableClassName="table-fixed min-w-[960px]"
              showPageSizeSelect={false}
              initialPerPage={10}
              tableAriaLabel="Agenda del día"
              tableScrollClassName="max-h-[472px] overflow-y-auto overscroll-contain"
              toolbarLeading={
                <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
                  <span className="text-[14px] font-semibold text-[#121215]">Tu agenda de hoy</span>
                  <span className="text-[11px] text-[#7d7d87]">{agendaDateLabel}</span>
                </div>
              }
              onRowClick={(row) => navigate(`/specialist/appointments/${row.id}`)}
              emptyStateNode={
                <EmptyState
                  variant="default"
                  title="Sin citas hoy"
                  description="No hay citas programadas para la fecha actual."
                  leadingIcon={Calendar}
                />
              }
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SpecialistDashboard;
