import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import {
  CONSULTATION_TYPE_OPTIONS,
  managementReportService,
  type ConsultationType,
} from '@/services/managementReportService';

const MAX_NOTES = 500;

function formatLongDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd/MM/yyyy', { locale: es });
  } catch {
    return '—';
  }
}

function initials(first: string, last: string): string {
  return [first, last]
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'PT';
}

const ManagementReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [consultationType, setConsultationType] = useState<ConsultationType | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['management-report', 'detail', appointmentId],
    queryFn: () => managementReportService.getById(appointmentId),
    enabled: Number.isFinite(appointmentId) && appointmentId > 0,
  });

  useEffect(() => {
    if (data) {
      setConsultationType(data.consultation_type);
      setNotes(data.report_notes ?? '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      managementReportService.save(appointmentId, {
        consultation_type: consultationType as ConsultationType,
        report_notes: notes,
      }),
    onSuccess: () => {
      toast({ title: 'Registro guardado', description: 'El informe de gestión fue actualizado.' });
      queryClient.invalidateQueries({ queryKey: ['management-report'] });
      navigate(isAdmin ? '/admin/management-report' : '/specialist/management-report');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo guardar el registro';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!consultationType) {
      toast({ title: 'Falta tipificación', description: 'Selecciona un tipo de consulta.', variant: 'destructive' });
      return;
    }
    if (!notes.trim()) {
      toast({ title: 'Falta comentario', description: 'Describe el resultado de la atención.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading || !data) {
    return (
      <PageLayout title="Informe de Gestión">
        <div className="h-64 flex items-center justify-center text-convision-text-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  const patient = data.patient;
  const patientName = patient ? `${patient.first_name} ${patient.last_name}`.trim() : 'Paciente';

  return (
    <PageLayout
      title={patientName}
      subtitle={`Gestión Clínica / Informe de Gestión / ${patientName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(isAdmin ? '/admin/management-report' : '/specialist/management-report')}
          >
            Volver
          </Button>
          {!isAdmin && (
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#0f8f64] hover:bg-[#0a6e4d] text-white"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Guardando...
              </>
            ) : (
              'Guardar Registro'
            )}
          </Button>
          )}
        </div>
      }
    >
      <div className="max-w-[1080px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-5">
          <Card className="px-5 py-4 border-convision-border-subtle shadow-none">
            <div className="flex flex-col gap-4">
              <span className="text-[13px] font-semibold text-convision-text">
                Información del paciente
              </span>
              <div className="flex items-start gap-4">
                <div className="size-12 bg-convision-light rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-convision-primary">
                    {initials(patient?.first_name ?? '', patient?.last_name ?? '')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-3 flex-1">
                  <InfoField label="Nombre" value={patientName} />
                  <InfoField label="Identificación" value={patient?.identification ?? '—'} />
                  <InfoField label="Teléfono" value={patient?.phone ?? '—'} />
                  <InfoField label="Sede" value="Sede Principal" />
                  <InfoField label="Última atención" value={formatLongDate(data.scheduled_at)} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="px-5 py-4 border-convision-border-subtle shadow-none">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-convision-text">
                  Tipo de consulta
                </span>
                <span className="text-[12px] text-convision-text-secondary">
                  Selecciona el resultado de esta atención
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {CONSULTATION_TYPE_OPTIONS.map((opt) => {
                  const selected = consultationType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !isAdmin && setConsultationType(opt.value)}
                      disabled={isAdmin}
                      className={`w-full text-left rounded-md border px-4 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                        selected
                          ? 'border-[#0f8f64] bg-[#e5f8ef]'
                          : 'border-convision-border-subtle hover:border-convision-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 size-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                            selected ? 'border-[#0f8f64]' : 'border-convision-border'
                          }`}
                        >
                          {selected && <span className="size-2 rounded-full bg-[#0f8f64]" />}
                        </span>
                        <div className="flex flex-col">
                          <span
                            className={`text-[13px] font-semibold ${
                              selected ? 'text-[#0a6e4d]' : 'text-convision-text'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="text-[12px] text-convision-text-secondary">
                            {opt.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="px-5 py-4 border-convision-border-subtle shadow-none">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-convision-text">
                Observaciones y resultado de la atención
              </span>
              <Label className="text-[12px] text-convision-text-secondary">
                Comentario <span className="text-[#d94545]">*</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
                placeholder="Describe el resultado de la consulta, indicaciones al paciente, producto recomendado o cualquier observación relevante..."
                rows={5}
                disabled={isAdmin}
                className="text-[13px] resize-none disabled:cursor-not-allowed"
              />
              <span className="text-[11px] text-convision-text-muted self-end">
                {notes.length} / {MAX_NOTES} caracteres
              </span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="px-5 py-4 border-convision-border-subtle shadow-none">
            <span className="text-[13px] font-semibold text-convision-text mb-3 block">
              Guía de tipificación
            </span>
            <ul className="flex flex-col gap-3">
              {CONSULTATION_TYPE_OPTIONS.map((opt) => (
                <li key={opt.value} className="flex items-start gap-2">
                  <span className="mt-1 size-2 rotate-45 bg-[#0f8f64] shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-convision-text">
                      {opt.shortLabel}
                    </span>
                    <span className="text-[11px] text-convision-text-secondary">
                      {opt.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="px-5 py-4 border-[#0f8f64]/30 bg-[#e5f8ef] shadow-none">
            <span className="text-[13px] font-semibold text-[#0a6e4d] block mb-1.5">
              Registro editable
            </span>
            <span className="text-[12px] text-[#0a6e4d]/85 leading-relaxed block">
              Este registro puede ser editado por el especialista en cualquier
              momento. El Admin puede visualizarlo pero no modificarlo.
            </span>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-convision-text-muted uppercase tracking-wider">{label}</span>
    <span className="text-[13px] font-semibold text-convision-text">{value}</span>
  </div>
);

export default ManagementReportDetail;
