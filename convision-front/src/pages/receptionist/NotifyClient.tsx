import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { toast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import EvidenceUploader from '@/components/lab-orders/EvidenceUploader';

const CONTACT_METHODS = [
  { value: 'phone', label: 'Llamada telefónica' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'Mensaje de texto (SMS)' },
  { value: 'in_person', label: 'Contacto en persona' },
  { value: 'other', label: 'Otro' },
];

const NotifyClient: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactMethod, setContactMethod] = useState('');
  const [observations, setObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    laboratoryOrderService
      .getLaboratoryOrder(Number(id))
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    if (!id || !contactMethod) {
      toast({
        title: 'Campo requerido',
        description: 'Seleccione el medio de contacto utilizado.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const methodLabel = CONTACT_METHODS.find((m) => m.value === contactMethod)?.label ?? contactMethod;
      const notes = [`Intento de contacto: ${methodLabel}`, observations.trim()]
        .filter(Boolean)
        .join(' — ');
      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), {
        status: order?.status ?? 'ready_for_delivery',
        notes,
      });
      toast({ title: 'Intento de contacto registrado' });
      navigate(`/receptionist/lab-orders/${id}`);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo registrar el intento de contacto.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = order?.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/receptionist/lab-orders/${id}`)}
      >
        Cancelar
      </Button>
      <Button
        size="sm"
        disabled={submitting || !contactMethod}
        onClick={handleRegister}
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
      >
        {submitting ? 'Registrando...' : 'Registrar intento de contacto'}
      </Button>
    </div>
  );

  return (
    <PageLayout
      title="Registrar Intento de Contacto"
      subtitle={
        order
          ? `Órdenes de Laboratorio / ${order.order_number}`
          : 'Órdenes de Laboratorio'
      }
      actions={actions}
    >
      {loading && <div className="py-8 text-center text-muted-foreground">Cargando...</div>}
      {!loading && order && (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Datos de contacto del paciente</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[11px] text-[#7d7d87] mb-0.5">Nombre</p>
                  <p className="font-medium">{patientName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#7d7d87] mb-0.5">Teléfono</p>
                  <p className="font-medium">{order.patient?.phone ?? '—'}</p>
                </div>
                {order.patient?.email && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-[#7d7d87] mb-0.5">Correo</p>
                    <p className="font-medium">{order.patient.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Intento de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#0f0f12]">
                    Medio de contacto utilizado <span className="text-red-500">*</span>
                  </label>
                  <Select value={contactMethod} onValueChange={setContactMethod}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Seleccione el medio…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#0f0f12]">
                    Observaciones <span className="text-[#7d7d87] font-normal">(opcional)</span>
                  </label>
                  <Textarea
                    placeholder="Ej: El paciente no contestó, se dejó mensaje de voz…"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Evidencia del intento{' '}
                  <span className="text-[#7d7d87] font-normal">(opcional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#7d7d87] mb-4">
                  Adjunte capturas de pantalla, fotos de mensajes o cualquier evidencia del contacto realizado.
                </p>
                <EvidenceUploader orderId={Number(id)} transitionType="notify_client" />
              </CardContent>
            </Card>
          </div>

          <div className="w-[272px] shrink-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Orden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] text-[#7d7d87] mb-0.5"># Orden</p>
                  <p className="font-medium">{order.order_number}</p>
                </div>
                {order.drawer_number && (
                  <div>
                    <p className="text-[11px] text-[#7d7d87] mb-0.5">Cajón asignado</p>
                    <p className="font-medium">Cajón #{order.drawer_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-[#7d7d87] mb-0.5">Estado</p>
                  <p className="font-medium">Listo para entrega</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#f1edff] border-[#8753ef]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#8753ef]">
                  Al registrar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#5c3aaa] leading-relaxed space-y-1.5">
                <p>• El intento queda en el historial de la orden.</p>
                <p>• El estado de la orden no cambia.</p>
                <p>• Puede adjuntar evidencia fotográfica del contacto.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default NotifyClient;
