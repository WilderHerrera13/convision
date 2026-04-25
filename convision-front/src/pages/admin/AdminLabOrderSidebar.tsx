import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SearchableCombobox from '@/components/ui/SearchableCombobox';
import { LaboratoryOrder, laboratoryOrderService } from '@/services/laboratoryOrderService';
import { userService, User } from '@/services/userService';

interface AdminLabOrderSidebarProps {
  order: LaboratoryOrder;
  onStatusUpdate: () => void;
}

const BASE = '/admin/laboratory-orders';

const AdminLabOrderSidebar: React.FC<AdminLabOrderSidebarProps> = ({ order, onStatusUpdate }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmQuality, setConfirmQuality] = useState(false);
  const [confirmResentFromLab, setConfirmResentFromLab] = useState(false);
  const [confirmPortfolio, setConfirmPortfolio] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [specialists, setSpecialists] = useState<User[]>([]);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('');

  const handleOpenQualityDialog = async () => {
    setSelectedSpecialistId('');
    setConfirmQuality(true);
    if (specialists.length === 0) {
      setLoadingSpecialists(true);
      try {
        const all = await userService.getAll();
        setSpecialists(all.filter((u) => u.role === 'specialist'));
      } catch {
        toast({ title: 'Error', description: 'No se pudo cargar la lista de especialistas.', variant: 'destructive' });
      } finally {
        setLoadingSpecialists(false);
      }
    }
  };

  const handleSendToQuality = async () => {
    setLoading(true);
    const specialist = specialists.find((u) => String(u.id) === selectedSpecialistId);
    const specialistName = specialist ? `${specialist.name} ${specialist.last_name ?? ''}`.trim() : '';
    const notes = specialistName ? `Médico asignado: ${specialistName} [uid:${specialist!.id}]` : '';
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, { status: 'in_quality', notes });
      toast({ title: 'Enviado a calidad', description: 'La orden fue enviada al especialista para revisión.' });
      setConfirmQuality(false);
      onStatusUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInTransit = async () => {
    setLoading(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, {
        status: 'in_transit',
        notes: 'Laboratorio reenvió el pedido corregido.',
      });
      toast({ title: 'Pedido en tránsito', description: 'La orden fue marcada como en camino desde el laboratorio.' });
      onStatusUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setConfirmResentFromLab(false);
    }
  };

  const handleMarkAsPortfolio = async () => {
    setLoadingPortfolio(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, { status: 'portfolio' });
      toast({ title: 'Marcada como cartera', description: 'La orden pasó a estado Cartera.' });
      onStatusUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setLoadingPortfolio(false);
      setConfirmPortfolio(false);
    }
  };

  const renderNextAction = () => {
    const { status } = order;

    if (status === 'delivered') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#228b52]">La orden ha sido entregada.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">El proceso ha finalizado exitosamente.</p>
        </>
      );
    }

    if (status === 'cancelled') {
      return <p className="text-[13px] font-semibold text-red-600">La orden fue cancelada.</p>;
    }

    if (status === 'portfolio') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#b57218]">Orden en cartera pendiente.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">El paciente no ha recogido su lente.</p>
        </>
      );
    }

    if (status === 'pending' || status === 'in_process' || status === 'in_progress') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#121215]">La orden está pendiente de envío.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">Confirma el despacho al laboratorio para iniciar el proceso.</p>
          <Button
            className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
            onClick={() => navigate(`${BASE}/${order.id}/confirm-shipment`)}
          >
            Confirmar envío a laboratorio
          </Button>
        </>
      );
    }

    if (status === 'sent_to_lab' || status === 'in_transit') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#121215]">La orden fue enviada al laboratorio y está siendo fabricada.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">Confirma la recepción cuando el mensajero entregue el pedido en sede.</p>
          <Button
            className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
            onClick={() => navigate(`${BASE}/${order.id}/confirm-reception`)}
          >
            Confirmar llegada del laboratorio
          </Button>
        </>
      );
    }

    if (status === 'returned_to_lab') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#b82626]">La orden fue retornada al laboratorio por no conformidad.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">Espera a que el laboratorio corrija y reenvíe el pedido. Luego confirma la nueva llegada.</p>
          <Button
            className="w-full mt-4 bg-[#b82626] hover:bg-[#9b1e1e] text-white h-10 text-[13px] font-semibold"
            onClick={() => setConfirmResentFromLab(true)}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Laboratorio reenvió el pedido'}
          </Button>
        </>
      );
    }

    if (status === 'received_from_lab') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#121215]">El lente llegó a sede y fue registrado.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">Envíalo al especialista para la revisión de calidad antes de entregarlo al paciente.</p>
          <Button
            className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
            onClick={() => handleOpenQualityDialog()}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar a control de calidad'}
          </Button>
        </>
      );
    }

    if (status === 'in_quality') {
      const qualityEntry = order.statusHistory
        ?.slice()
        .reverse()
        .find((e) => e.status === 'in_quality' && e.notes?.startsWith('Médico asignado:'));
      const assignedSpecialist = qualityEntry?.notes
        ? qualityEntry.notes.replace(/\s*\[uid:\d+\]\s*$/, '').replace(/^Médico asignado:\s*/i, '')
        : null;

      return (
        <>
          <p className="text-[13px] font-semibold text-[#121215]">El lente está en revisión de calidad.</p>
          {assignedSpecialist ? (
            <div className="mt-2 flex items-center justify-between gap-2 bg-[#f0faf5] border border-[#a6d9bd] rounded-lg px-3 py-2">
              <div>
                <p className="text-[10px] text-[#0a6b4a] font-semibold uppercase tracking-wide">Médico asignado</p>
                <p className="text-[13px] font-semibold text-[#121215]">{assignedSpecialist}</p>
              </div>
              <button
                type="button"
                className="text-[11px] text-[#7d7d87] underline hover:text-[#3a71f7] transition-colors shrink-0"
                onClick={() => handleOpenQualityDialog()}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-[12px] text-[#7d7d87]">Sin médico asignado. Asigna un especialista para que realice la revisión.</p>
              <Button
                className="w-full mt-3 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-9 text-[13px] font-semibold"
                onClick={() => handleOpenQualityDialog()}
                disabled={loading}
              >
                Asignar médico especialista
              </Button>
            </div>
          )}
          <div className="h-px bg-[#f0f0f2] my-3" />
          <p className="text-[11px] text-[#7d7d87] mb-2">Acciones administrativas</p>
          <Button
            variant="outline"
            className="w-full h-9 text-[13px] border-[#c7d7ff] text-[#3a71f7] hover:bg-[#f0f4ff]"
            onClick={() => navigate(`/specialist/laboratory-orders/${order.id}`)}
          >
            Revisar y aprobar calidad
          </Button>
          <Button
            className="w-full mt-2 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-9 text-[13px] font-semibold"
            onClick={() => navigate(`${BASE}/${order.id}/assign-drawer`)}
          >
            Aprobar calidad y asignar cajón
          </Button>
        </>
      );
    }

    if (status === 'quality_approved') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#0a6b4a]">El médico aprobó la revisión de calidad.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">
            Recibe el lente del médico especialista y asígnale un cajón para proceder a la entrega.
          </p>
          <Button
            className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
            onClick={() => navigate(`${BASE}/${order.id}/assign-drawer`)}
          >
            Recibir del médico y asignar cajón
          </Button>
        </>
      );
    }

    if (status === 'ready_for_delivery') {
      return (
        <>
          <p className="text-[13px] font-semibold text-[#121215]">La orden está lista en sede.</p>
          <p className="text-[12px] text-[#7d7d87] mt-1">
            {order.drawer_number
              ? `Cajón #${order.drawer_number} disponible. Confirma la entrega al paciente.`
              : 'Confirma la entrega al paciente y registra el pago.'}
          </p>
          <Button
            className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
            onClick={() => navigate(`${BASE}/${order.id}/confirm-delivery`)}
          >
            Confirmar entrega y pago
          </Button>
          <Button
            variant="outline"
            className="w-full mt-2 h-9 text-[13px]"
            onClick={() => navigate(`${BASE}/${order.id}/notify-client`)}
          >
            Notificar cliente nuevamente
          </Button>
          <button
            className="w-full text-[12px] text-[#7d7d87] underline text-center mt-4 hover:text-[#3a71f7] transition-colors"
            onClick={() => setConfirmPortfolio(true)}
          >
            Marcar como cartera (no recogió)
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-6 px-5">
          <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-1">
            Próxima acción
          </p>
          <div className="mt-1">{renderNextAction()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5 px-5">
          <p className="text-[14px] font-semibold text-[#121215]">Resumen</p>
          <p className="text-[11px] text-[#7d7d87] mb-3">Datos generales de la orden</p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-[#7d7d87]">Paciente</p>
              <p className="text-[13px] font-medium text-[#121215] mt-0.5">
                {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7d7d87]">Laboratorio</p>
              <p className="text-[13px] font-medium text-[#121215] mt-0.5">
                {order.laboratory?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7d7d87]">Fecha de creación</p>
              <p className="text-[13px] font-medium text-[#121215] mt-0.5">
                {new Date(order.created_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#7d7d87]">Sede</p>
              <p className="text-[13px] font-medium text-[#121215] mt-0.5">Sede Principal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.laboratory && (
        <Card>
          <CardContent className="pt-5 pb-5 px-5">
            <p className="text-[14px] font-semibold text-[#121215]">Contacto del laboratorio</p>
            <div className="h-px bg-[#e5e5e9] mt-3 mb-3" />
            <p className="text-[13px] font-semibold text-[#121215]">{order.laboratory.name}</p>
            {order.laboratory.contact_person && (
              <div className="mt-3">
                <p className="text-[11px] text-[#7d7d87]">Responsable</p>
                <p className="text-[13px] text-[#121215] mt-0.5">{order.laboratory.contact_person}</p>
              </div>
            )}
            {(order.laboratory.phone || order.laboratory.email) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {order.laboratory.phone && (
                  <div>
                    <p className="text-[11px] text-[#7d7d87]">Teléfono</p>
                    <p className="text-[12px] text-[#121215] mt-0.5">{order.laboratory.phone}</p>
                  </div>
                )}
                {order.laboratory.email && (
                  <div>
                    <p className="text-[11px] text-[#7d7d87]">Correo</p>
                    <p className="text-[12px] text-[#121215] mt-0.5 break-all">{order.laboratory.email}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-[#c7d7ff] bg-[#f0f4ff] px-4 py-4">
        <p className="text-[13px] font-semibold text-[#3a71f7] flex items-center gap-1.5">
          <span>◆</span> Trazabilidad completa
        </p>
        <p className="text-[12px] text-[#3a71f7] mt-2 leading-[1.5]">
          Cada cambio de estado queda registrado con responsable, fecha y duración. Útil para auditoría y SLA.
        </p>
      </div>

      <Dialog open={confirmQuality} onOpenChange={(open) => { if (!loading) setConfirmQuality(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar a control de calidad</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-[13px] text-[#7d7d87]">
              Selecciona el médico especialista que realizará la revisión de calidad del lente.
            </p>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#121215]">Médico especialista *</label>
              {loadingSpecialists ? (
                <div className="h-9 bg-[#f0f0f2] rounded-md animate-pulse" />
              ) : (
                <SearchableCombobox
                  options={specialists.map((u) => ({
                    value: String(u.id),
                    label: `${u.name} ${u.last_name ?? ''}`.trim(),
                  }))}
                  value={selectedSpecialistId}
                  onChange={setSelectedSpecialistId}
                  placeholder="Seleccionar especialista..."
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmQuality(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#3a71f7] hover:bg-[#2d5fd6] text-white"
              onClick={handleSendToQuality}
              disabled={loading || !selectedSpecialistId}
            >
              {loading ? 'Enviando...' : 'Confirmar y enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmResentFromLab}
        onOpenChange={setConfirmResentFromLab}
        title="Confirmar reenvío del laboratorio"
        description="La orden cambiará al estado 'En tránsito'. Confirma solo cuando el laboratorio haya enviado el pedido corregido."
        confirmLabel="Confirmar reenvío"
        variant="warning"
        onConfirm={handleMarkInTransit}
        isLoading={loading}
      />

      <ConfirmDialog
        open={confirmPortfolio}
        onOpenChange={setConfirmPortfolio}
        title="Marcar como cartera"
        description='La orden pasará a estado "Cartera" indicando que el paciente no ha recogido su pedido.'
        confirmLabel="Confirmar"
        variant="warning"
        onConfirm={handleMarkAsPortfolio}
        isLoading={loadingPortfolio}
      />
    </div>
  );
};

export default AdminLabOrderSidebar;
