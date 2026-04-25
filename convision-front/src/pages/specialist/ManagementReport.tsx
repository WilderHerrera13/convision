import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/ui/pagination';
import PageLayout from '@/components/layouts/PageLayout';
import AppointmentStatusBadge from '@/components/appointments/AppointmentStatusBadge';
import {
  CONSULTATION_TYPE_OPTIONS,
  managementReportService,
  type ConsultationType,
  type ManagementReportRecord,
} from '@/services/managementReportService';
import { userService, User } from '@/services/userService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PER_PAGE = 7;

function formatRowDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd/MM/yy', { locale: es });
  } catch {
    return '—';
  }
}

function consultationLabel(value: ConsultationType | null): string {
  if (!value) return '—';
  return CONSULTATION_TYPE_OPTIONS.find((opt) => opt.value === value)?.shortLabel ?? value;
}

const ManagementReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [specialistId, setSpecialistId] = useState<string>('all');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
    enabled: isAdmin,
  });
  const specialists = useMemo(() => users.filter((u) => u.role === 'specialist'), [users]);

  const { data, isLoading } = useQuery({
    queryKey: ['management-report', page, search, specialistId],
    queryFn: () =>
      managementReportService.list({
        page,
        perPage: PER_PAGE,
        search: search.trim() || undefined,
        specialistId: specialistId !== 'all' ? specialistId : undefined,
        pendingReport: !isAdmin,
      }),
    placeholderData: (prev) => prev,
  });

  const today = useMemo(
    () => format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
    [],
  );
  const rows: ManagementReportRecord[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;
  const fromItem = rows.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const toItem = rows.length === 0 ? 0 : Math.min(fromItem + rows.length - 1, total);

  return (
    <PageLayout
      title="Informe de Gestión"
      subtitle="Gestión Clínica / Informe de Gestión"
    >
      <div className="max-w-[1080px] mx-auto w-full">
        <Card className="overflow-hidden border-convision-border-subtle shadow-none">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-convision-text">
                Pacientes atendidos
              </span>
              <span className="text-[12px] text-convision-text-secondary first-letter:capitalize">
                {today}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Select value={specialistId} onValueChange={setSpecialistId}>
                  <SelectTrigger className="w-[200px] h-9 text-[13px]">
                    <SelectValue placeholder="Todos los especialistas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los especialistas</SelectItem>
                    {specialists.map((spec) => (
                      <SelectItem key={spec.id} value={String(spec.id)}>
                        {spec.name} {spec.last_name || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-convision-text-muted" />
                <Input
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-[13px]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-convision-border-subtle">
            <Table>
              <TableHeader>
                <TableRow className="bg-convision-background hover:bg-convision-background">
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold w-[92px]">
                    Fecha
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Paciente
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Tipo de consulta
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Sede
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Resultado
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold text-right w-[140px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <Loader2 className="size-4 animate-spin inline-block text-convision-text-muted" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[13px] text-convision-text-secondary">
                      No hay atenciones registradas aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const patientName = row.patient
                      ? `${row.patient.first_name} ${row.patient.last_name}`.trim()
                      : 'Paciente';
                    return (
                      <TableRow key={row.id} className="h-[52px] hover:bg-convision-background/60">
                        <TableCell className="text-[13px] text-convision-text-secondary font-medium">
                          {formatRowDate(row.scheduled_at)}
                        </TableCell>
                        <TableCell className="text-[13px] font-semibold text-convision-text">
                          {patientName}
                        </TableCell>
                        <TableCell className="text-[13px] text-convision-text-secondary">
                          {consultationLabel(row.consultation_type)}
                        </TableCell>
                        <TableCell className="text-[13px] text-convision-text-secondary">
                          Sede Principal
                        </TableCell>
                        <TableCell>
                          <AppointmentStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="Ver"
                              onClick={() => navigate(isAdmin ? `/admin/management-report/${row.id}` : `/specialist/management-report/${row.id}`)}
                              className="inline-flex size-8 items-center justify-center rounded-md bg-[#e5f0ff] text-[#3a71f7] hover:bg-[#d7e6ff] transition-colors"
                            >
                              <Eye className="size-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-t border-convision-border-subtle">
            <span className="text-[12px] text-convision-text-secondary">
              Mostrando{' '}
              <span className="font-semibold text-convision-text">
                {fromItem}-{toItem}
              </span>{' '}
              de {total} atenciones
            </span>
            <Pagination
              variant="figma"
              currentPage={page}
              totalPages={lastPage}
              onPageChange={setPage}
            />
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ManagementReport;
