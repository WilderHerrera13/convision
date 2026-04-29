import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Calendar, XCircle, Plus, Search, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import Pagination from '@/components/ui/pagination';
import PageLayout from '@/components/layouts/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { appointmentsService } from '@/services/appointmentsService';
import { parseLocalDatetime, formatTime12h } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AppointmentStatusBadge, { Status } from '@/components/appointments/AppointmentStatusBadge';
import { AdminBranchFilter } from '@/components/admin/AdminBranchFilter';

type DateFilter = 'today' | 'tomorrow' | 'week' | 'month';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
];

function getDateRange(filter: DateFilter) {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { startDate: format(startOfDay(now), 'yyyy-MM-dd'), endDate: format(endOfDay(now), 'yyyy-MM-dd') };
    case 'tomorrow': {
      const tomorrow = addDays(now, 1);
      return { startDate: format(startOfDay(tomorrow), 'yyyy-MM-dd'), endDate: format(endOfDay(tomorrow), 'yyyy-MM-dd') };
    }
    case 'week':
      return { startDate: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), endDate: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'month':
      return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
  }
}

function getTableTitle(filter: DateFilter): string {
  const titles: Record<DateFilter, string> = {
    today: 'Citas de hoy',
    tomorrow: 'Citas de mañana',
    week: 'Citas de esta semana',
    month: 'Citas de este mes',
  };
  return titles[filter];
}

function getTableSubtitle(filter: DateFilter): string {
  const now = new Date();
  if (filter === 'today') return format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  if (filter === 'tomorrow') return format(addDays(now, 1), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  if (filter === 'week') {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
  }
  return format(now, 'MMMM yyyy', { locale: es });
}

const ITEMS_PER_PAGE = 10;

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<string>('all');

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const isSpecialist = user?.role === 'specialist';
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', dateFilter, search, page, user?.role, branchId],
    queryFn: () => {
      const filters: Record<string, unknown> = isSpecialist ? { status: 'completed' } : {};
      if (isAdmin && branchId !== 'all') {
        filters.branch_id = Number(branchId);
      }
      return appointmentsService.getAppointments({
        page,
        perPage: ITEMS_PER_PAGE,
        sort: 'scheduled_at,asc',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        search: search || undefined,
        filters,
      });
    },
    placeholderData: (prev) => prev,
  });

  const appointments = data?.data ?? [];
  const totalPages = data?.meta?.last_page?.[0] ?? 1;
  const totalItems = data?.meta?.total?.[0] ?? 0;
  const fromItem = data?.meta?.from?.[0] ?? 0;
  const toItem = data?.meta?.to?.[0] ?? 0;

  const handleFilterChange = useCallback((filter: DateFilter) => {
    setDateFilter(filter);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const getDetailPath = (id: number) => {
    if (user?.role === 'specialist') return `/specialist/appointments/${id}`;
    if (user?.role === 'admin') return `/admin/appointments/${id}`;
    return `/receptionist/appointments/${id}`;
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    const id = cancelTargetId;
    setCancelTargetId(null);
    setCancellingId(id);
    try {
      await appointmentsService.cancelAppointment(id);
      toast({ title: 'Cita cancelada', description: 'La cita ha sido cancelada exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cancelar la cita.' });
    } finally {
      setCancellingId(null);
    }
  };

  const pageActions = user?.role !== 'specialist' ? (
    <Button
      className="bg-convision-primary hover:bg-convision-dark text-white text-[13px] font-semibold h-9 px-4"
      onClick={() => navigate('/receptionist/appointments/new')}
    >
      <Plus className="h-4 w-4 mr-1.5" />
      Nueva cita
    </Button>
  ) : undefined;

  return (
    <PageLayout
      title={isSpecialist ? 'Citas Atendidas' : 'Citas'}
      subtitle={isSpecialist ? 'Historial de citas finalizadas' : 'Gestión de agenda'}
      actions={pageActions}
    >
      <div className="space-y-4">
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-2">
          {DATE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                dateFilter === key
                  ? 'bg-[#e6effa] text-[#195fa5]'
                  : 'bg-white border border-[#e0e2e5] text-[#59687a] hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table Card */}
        <Card className="border border-[#e5e5e9] rounded-lg overflow-hidden shadow-none">
          {/* Table Toolbar */}
          <div className="bg-white border-b border-[#e5e5e9] px-5 h-[52px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[14px] font-semibold text-[#121215]">
                  {isSpecialist ? `Citas atendidas — ${getTableSubtitle(dateFilter)}` : getTableTitle(dateFilter)}
                </p>
                <p className="text-[11px] text-[#7d7d87] capitalize">
                  {isSpecialist ? 'Solo se muestran citas con estado Atendido' : getTableSubtitle(dateFilter)}
                </p>
              </div>
              {isAdmin && (
                <AdminBranchFilter value={branchId} onChange={setBranchId} />
              )}
            </div>
            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#b4b5bc]" />
              <Input
                placeholder="Buscar paciente..."
                value={search}
                onChange={handleSearchChange}
                className="pl-8 h-[34px] text-[12px] border-[#e5e5e9] rounded-md"
              />
            </div>
          </div>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f6] hover:bg-[#f5f5f6] border-0">
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2 w-[80px]">Hora</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2">Paciente</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2">Especialista</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2">Motivo</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2 w-[140px]">Estado</TableHead>
                  <TableHead className="text-[11px] font-semibold text-[#7d7d87] px-3 py-2 w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-[#e5e5e9]">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j} className="px-3 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[#7d7d87] text-sm">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No hay citas para este período
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      className="border-b border-[#e5e5e9] hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => navigate(getDetailPath(appointment.id))}
                    >
                      <TableCell className="px-3 py-3 text-[13px] text-[#7d7d87]">
                        {appointment.scheduled_at ? formatTime12h(parseLocalDatetime(appointment.scheduled_at) ?? new Date()) : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-[13px] font-semibold text-[#121215]">
                        {appointment.patient.first_name} {appointment.patient.last_name}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-[13px] text-[#7d7d87]">
                        {appointment.specialist.name}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-[13px] text-[#7d7d87] max-w-[220px] truncate">
                        {appointment.notes || '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <AppointmentStatusBadge status={appointment.status as Status} />
                      </TableCell>
                      <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Ver detalle"
                            className="h-8 w-8 flex items-center justify-center rounded-md bg-convision-light border border-convision-primary/30 hover:bg-blue-100 transition-colors"
                            onClick={() => navigate(getDetailPath(appointment.id))}
                          >
                            <Eye className="h-4 w-4 text-convision-primary" />
                          </button>
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              title="Editar cita"
                              className="h-8 w-8 flex items-center justify-center rounded-md bg-white border border-[#d8dbe2] hover:bg-slate-50 transition-colors"
                              onClick={() => navigate(`/receptionist/appointments/${appointment.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4 text-[#59687a]" />
                            </button>
                          )}
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              title="Cancelar cita"
                              disabled={cancellingId === appointment.id}
                              className="h-8 w-8 flex items-center justify-center rounded-md bg-[#fff0f0] border border-[#f5baba] hover:bg-red-100 transition-colors disabled:opacity-50"
                              onClick={() => setCancelTargetId(appointment.id)}
                            >
                              {cancellingId === appointment.id
                                ? <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                : <XCircle className="h-4 w-4 text-red-500" />}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {totalItems > 0 && (
              <div className="bg-white border-t border-[#e5e5e9] px-5 h-[48px] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
                  <span>Mostrando</span>
                  <span className="bg-[#f5f5f6] px-1.5 py-0.5 rounded text-[#121215] font-semibold text-[12px]">
                    {fromItem}–{toItem}
                  </span>
                  <span>de {totalItems} resultados</span>
                </div>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => { if (!open) setCancelTargetId(null); }}
        title="Cancelar cita"
        description="Esta acción no se puede deshacer. ¿Confirmar cancelación de la cita?"
        confirmLabel="Cancelar cita"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={handleCancelConfirm}
        isLoading={cancellingId !== null}
      />
    </PageLayout>
  );
};

export default Appointments;
