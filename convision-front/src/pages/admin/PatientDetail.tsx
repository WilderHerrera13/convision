import React from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  MapPin,
  Shield,
  Briefcase,
  FileText,
  Calendar,
  ShoppingCart,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/layouts/PageLayout';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/lib/axios';
import { patientService } from '@/services/patientService';
import { appointmentsService, type Appointment } from '@/services/appointmentsService';
import { saleService, type Sale } from '@/services/saleService';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

const APPOINTMENT_STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'En curso', className: 'bg-amber-50 text-amber-700' },
  paused: { label: 'En pausa', className: 'bg-orange-50 text-orange-700' },
  completed: { label: 'Completada', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-50 text-red-700' },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700' },
  partial: { label: 'Parcial', className: 'bg-blue-50 text-blue-700' },
  paid: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700' },
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[#7d7d87]">{label}</p>
      <p className="mt-0.5 text-[13px] text-[#121215]">{value || '—'}</p>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border border-[#ebebee] shadow-sm">
      <CardHeader className="border-b border-[#e5e5e9] py-3 px-5">
        <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#0f0f12]">
          <Icon className="h-4 w-4 text-[#7d7d87]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 p-5 sm:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}

const PatientDetail: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const basePath = isAdminRoute ? '/admin' : '/receptionist';
  const numericId = patientId ? Number(patientId) : NaN;

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ['patient', numericId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/patients/${numericId}`);
      return res.data?.data ?? res.data;
    },
    enabled: Number.isFinite(numericId),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['patient-appointments', numericId],
    queryFn: () =>
      appointmentsService.getAppointments({
        perPage: 5,
        filters: { patient_id: numericId },
        sort: 'scheduled_at,desc',
      }),
    enabled: Number.isFinite(numericId),
  });

  const { data: salesData } = useQuery({
    queryKey: ['patient-sales', numericId],
    queryFn: () => saleService.getSales({ patient_id: numericId, per_page: 5, page: 1 }),
    enabled: Number.isFinite(numericId),
  });

  if (!Number.isFinite(numericId)) {
    navigate(`${basePath}/patients`, { replace: true });
    return null;
  }

  if (isLoading) return <LoadingScreen />;

  if (isError || !patient) {
    return (
      <PageLayout title="Paciente" subtitle="Pacientes">
        <div className="rounded-lg border border-[#ebebee] bg-white p-8 text-center text-sm text-[#7d7d87]">
          No se encontró el paciente.
          <div className="mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(`${basePath}/patients`)}
            >
              Volver
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
  const age =
    patient.birth_date ? differenceInYears(new Date(), parseISO(patient.birth_date)) : null;
  const profileImageUrl = patient.profile_image
    ? patientService.getProfileImageUrl(patient.id)
    : null;

  const genderLabel: Record<string, string> = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro',
  };

  const appointments: Appointment[] = (appointmentsData as { data: Appointment[] } | undefined)?.data ?? [];
  const sales: Sale[] = (salesData as { data: Sale[] } | undefined)?.data ?? [];

  return (
    <PageLayout
      title={fullName}
      subtitle="Pacientes"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md text-[13px]"
            asChild
          >
            <Link to={`${basePath}/patients`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Volver
            </Link>
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md bg-[#3a71f7] text-[13px] font-semibold text-white hover:bg-[#2f62db]"
            onClick={() => navigate(`${basePath}/patients/${numericId}/edit`)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardContent className="flex items-center gap-5 p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f0f0f5]">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-[#b0b0be]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-[#0f0f12]">{fullName}</h2>
              <p className="mt-0.5 text-[13px] text-[#7d7d87]">
                {patient.identification_type ? `${patient.identification_type} ` : 'CC '}
                {patient.identification}
                {age !== null ? ` · ${age} años` : ''}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-semibold',
                patient.status === 'active'
                  ? 'bg-[#ebf5ef] text-[#228b52]'
                  : 'bg-[#f9f9fa] text-[#7d7d87]',
              )}
            >
              {patient.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </CardContent>
        </Card>

        {/* Personal */}
        <SectionCard icon={User} title="Información personal">
          <InfoRow label="Nombre" value={patient.first_name} />
          <InfoRow label="Apellido" value={patient.last_name} />
          <InfoRow
            label="Fecha de nacimiento"
            value={
              patient.birth_date
                ? format(parseISO(patient.birth_date), "d 'de' MMMM 'de' yyyy", { locale: es })
                : null
            }
          />
          <InfoRow label="Edad" value={age !== null ? `${age} años` : null} />
          <InfoRow
            label="Género"
            value={patient.gender ? genderLabel[patient.gender] : null}
          />
          <InfoRow label="Tipo de identificación" value={patient.identification_type} />
          <InfoRow label="Número de identificación" value={patient.identification} />
        </SectionCard>

        {/* Contact */}
        <SectionCard icon={Phone} title="Contacto">
          <InfoRow label="Correo electrónico" value={patient.email} />
          <InfoRow label="Teléfono" value={patient.phone} />
        </SectionCard>

        {/* Location */}
        <SectionCard icon={MapPin} title="Ubicación">
          <InfoRow label="Dirección" value={patient.address} />
          <InfoRow label="Barrio" value={patient.neighborhood} />
          <InfoRow label="Ciudad" value={patient.city} />
          <InfoRow label="Departamento" value={patient.state} />
          <InfoRow label="País" value={patient.country} />
          <InfoRow label="Código postal" value={patient.postal_code} />
        </SectionCard>

        {/* Health */}
        <SectionCard icon={Shield} title="Seguro médico">
          <InfoRow label="EPS / Aseguradora" value={patient.eps} />
          <InfoRow label="Tipo de afiliación" value={patient.affiliation} />
          <InfoRow label="Tipo de cobertura" value={patient.coverage} />
        </SectionCard>

        {/* Occupational */}
        <SectionCard icon={Briefcase} title="Información laboral">
          <InfoRow label="Ocupación" value={patient.occupation} />
          <InfoRow label="Cargo" value={patient.position} />
          <InfoRow label="Empresa" value={patient.company} />
          <InfoRow label="Nivel educativo" value={patient.education} />
        </SectionCard>

        {/* Notes */}
        {patient.notes && (
          <Card className="rounded-lg border border-[#ebebee] shadow-sm">
            <CardHeader className="border-b border-[#e5e5e9] py-3 px-5">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#0f0f12]">
                <FileText className="h-4 w-4 text-[#7d7d87]" />
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="whitespace-pre-wrap text-[13px] text-[#121215]">{patient.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Appointments */}
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9] py-3 px-5">
            <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#0f0f12]">
              <Calendar className="h-4 w-4 text-[#7d7d87]" />
              Citas recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  leadingIcon={Calendar}
                  accentColor="blue"
                  title="Sin citas"
                  description="Este paciente no tiene citas registradas."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f5]">
                {appointments.map((apt) => {
                  const status =
                    APPOINTMENT_STATUS[apt.status] ?? {
                      label: apt.status,
                      className: 'bg-gray-50 text-gray-700',
                    };
                  return (
                    <div key={apt.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#121215]">
                          {apt.scheduled_at
                            ? format(parseISO(apt.scheduled_at), "d MMM yyyy HH:mm", {
                                locale: es,
                              })
                            : '—'}
                        </p>
                        {apt.specialist && (
                          <p className="text-[11px] text-[#7d7d87]">
                            {apt.specialist.name}
                            {apt.reason ? ` · ${apt.reason}` : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          status.className,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales */}
        <Card className="rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9] py-3 px-5">
            <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#0f0f12]">
              <ShoppingCart className="h-4 w-4 text-[#7d7d87]" />
              Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sales.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  leadingIcon={ShoppingCart}
                  accentColor="green"
                  title="Sin ventas"
                  description="Este paciente no tiene ventas registradas."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f5]">
                {sales.map((sale) => {
                  const payStatus =
                    PAYMENT_STATUS[sale.payment_status] ?? {
                      label: sale.payment_status,
                      className: 'bg-gray-50 text-gray-700',
                    };
                  return (
                    <div key={sale.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                        <ShoppingCart className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#121215]">
                          {sale.sale_number}
                        </p>
                        <p className="text-[11px] text-[#7d7d87]">
                          {sale.created_at
                            ? format(parseISO(sale.created_at), "d MMM yyyy", { locale: es })
                            : '—'}
                          {' · '}
                          <span className="font-medium text-[#121215]">
                            ${Number(sale.total).toLocaleString('es-CO')}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            payStatus.className,
                          )}
                        >
                          {payStatus.label}
                        </span>
                        <Link
                          to={`${basePath}/sales/${sale.id}`}
                          className="flex items-center justify-center h-7 w-7 rounded-[6px] bg-convision-light border border-convision-primary/30 text-convision-primary hover:opacity-80 transition-colors"
                          title="Ver venta"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default PatientDetail;
