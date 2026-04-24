import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LaboratoryOrder, laboratoryOrderService } from '@/services/laboratoryOrderService';

interface LabOrderSidebarProps {
  order: LaboratoryOrder;
  onStatusUpdate: () => void;
}

const LabOrderSidebar: React.FC<LabOrderSidebarProps> = ({ order, onStatusUpdate }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id, status } = order;
  const [sendingToQuality, setSendingToQuality] = useState(false);

  const handleMarkAsPortfolio = async () => {
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(id, { status: 'portfolio' });
      onStatusUpdate();
    } catch (_err) {
      // silent — no disruptive feedback for portfolio marking
    }
  };

  const handleSendToQuality = async () => {
    setSendingToQuality(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(id, { status: 'in_quality', notes: '' });
      toast({ title: 'Enviado a calidad', description: 'La orden fue enviada al especialista para revisión.' });
      onStatusUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setSendingToQuality(false);
    }
  };

  const renderNextAction = () => {
    if (status === 'delivered') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">La orden ha sido entregada.</p>
          <p className="text-sm text-[#0f0f12] mt-1">El proceso ha finalizado exitosamente.</p>
        </>
      );
    }
    if (status === 'cancelled') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">La orden fue cancelada.</p>
        </>
      );
    }
    if (status === 'portfolio') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">Orden en cartera pendiente.</p>
          <p className="text-sm text-[#0f0f12] mt-1">El paciente no ha recogido su lente.</p>
        </>
      );
    }
    if (status === 'pending') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">La orden está pendiente de envío.</p>
          <p className="text-sm text-[#0f0f12] mt-1">Confirma el despacho al laboratorio para iniciar el proceso.</p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-shipment`)}
          >
            Confirmar envío a laboratorio
          </Button>
        </>
      );
    }
    if (status === 'sent_to_lab') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">La orden fue enviada al laboratorio y está siendo fabricada.</p>
          <p className="text-sm text-[#0f0f12] mt-1">Confirma la recepción cuando el mensajero entregue el pedido en sede.</p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-reception`)}
          >
            Confirmar llegada del laboratorio
          </Button>
        </>
      );
    }
    if (status === 'in_transit') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">El laboratorio ha enviado los lentes. El mensajero está en camino a sede.</p>
          <p className="text-sm text-[#0f0f12] mt-1">Confirma la recepción cuando el mensajero entregue el pedido.</p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-reception`)}
          >
            Confirmar llegada en sede
          </Button>
        </>
      );
    }
    if (status === 'received_from_lab') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">El lente llegó a sede y fue registrado.</p>
          <p className="text-sm text-[#0f0f12] mt-1">Envíalo al especialista para la revisión de calidad antes de entregarlo al paciente.</p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={handleSendToQuality}
            disabled={sendingToQuality}
          >
            {sendingToQuality ? 'Enviando...' : 'Enviar a control de calidad'}
          </Button>
        </>
      );
    }
    if (status === 'in_quality') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">El lente está en revisión de calidad.</p>
          <p className="text-sm text-[#0f0f12] mt-1">Asigna un cajón cuando sea aprobado por el especialista.</p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/assign-drawer`)}
          >
            Asignar cajón
          </Button>
        </>
      );
    }
    if (status === 'ready_for_delivery') {
      return (
        <>
          <p className="text-sm font-medium text-[#8753ef]">La orden está lista en sede.</p>
          <p className="text-sm text-[#0f0f12] mt-1">
            {order.drawer_number
              ? `Cajón #${order.drawer_number} disponible. Confirma la entrega al paciente.`
              : 'Confirma la entrega al paciente y registra el pago.'}
          </p>
          <Button
            className="w-full mt-4 bg-[#8753ef] hover:bg-[#7040d6] text-white h-10"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-delivery`)}
          >
            Confirmar entrega y pago
          </Button>
          <Button
            variant="outline"
            className="w-full mt-2 h-9"
            onClick={() => navigate(`/receptionist/lab-orders/${id}/notify-client`)}
          >
            Notificar cliente nuevamente
          </Button>
          <button
            className="w-full text-sm text-[#7d7d87] underline text-center mt-4 hover:text-[#8753ef] transition-colors"
            onClick={handleMarkAsPortfolio}
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
          <p className="text-base font-semibold text-[#0f0f12]">Próxima acción</p>
          <div className="mt-2">
            {renderNextAction()}
          </div>
        </CardContent>
      </Card>

      {order.laboratory && (
        <Card>
          <CardContent className="pt-5 pb-5 px-5">
            <p className="text-base font-semibold text-[#0f0f12]">Contacto del laboratorio</p>
            <div className="h-px bg-[#e5e5e9] mt-3 mb-3" />
            <p className="font-semibold text-sm text-[#0f0f12]">{order.laboratory.name}</p>
            {order.laboratory.contact_person && (
              <div className="mt-3">
                <p className="text-xs text-[#7d7d87]">Responsable</p>
                <p className="text-sm text-[#0f0f12] mt-0.5">{order.laboratory.contact_person}</p>
              </div>
            )}
            {order.laboratory.phone && (
              <div className="mt-3">
                <p className="text-xs text-[#7d7d87]">Teléfono</p>
                <p className="text-sm text-[#0f0f12] mt-0.5">{order.laboratory.phone}</p>
              </div>
            )}
            {order.laboratory.email && (
              <div className="mt-3">
                <p className="text-xs text-[#7d7d87]">Correo</p>
                <p className="text-sm text-[#0f0f12] mt-0.5">{order.laboratory.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {order.pdf_token && (
        <div className="rounded-lg border border-[#d4c4ff] bg-[#f5f0ff] px-4 py-4">
          <p className="text-sm font-semibold text-[#8753ef] flex items-center gap-1.5">
            <span>◆</span> Sobre el PDF
          </p>
          <p className="text-sm text-[#8753ef] mt-2 leading-[1.5]">
            Incluye fórmula completa, especificaciones del lente y guía firmable para entregar.
          </p>
          <p className="text-sm text-[#8753ef] mt-2">
            Imprime una copia para el archivo de la sede.
          </p>
        </div>
      )}
    </div>
  );
};

export default LabOrderSidebar;
