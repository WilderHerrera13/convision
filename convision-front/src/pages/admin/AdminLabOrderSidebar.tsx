import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { LaboratoryOrder, laboratoryOrderService } from '@/services/laboratoryOrderService';

interface AdminLabOrderSidebarProps {
  order: LaboratoryOrder;
  onStatusUpdate: () => void;
}

interface ActionConfig {
  title: string;
  description: string;
  buttonLabel: string;
  nextStatus: string;
  confirmRequired?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
}

function getActionConfig(status: string, order: LaboratoryOrder): ActionConfig | null {
  switch (status) {
    case 'pending':
      return {
        title: 'Verificar y enviar a laboratorio',
        description: 'La orden está pendiente. Confirma los datos y envíala al laboratorio para iniciar el proceso.',
        buttonLabel: 'Enviar a laboratorio',
        nextStatus: 'in_process',
        confirmRequired: true,
        confirmTitle: '¿Enviar a laboratorio?',
        confirmDescription: 'La orden cambiará a estado "En proceso". Esta acción quedará registrada en el historial.',
      };
    case 'in_process':
    case 'in_progress':
      return {
        title: 'Despachar al laboratorio externo',
        description: 'Empaca el producto y entrega la guía al mensajero. Registra el envío cuando salga.',
        buttonLabel: 'Registrar envío',
        nextStatus: 'sent_to_lab',
        confirmRequired: true,
        confirmTitle: '¿Registrar envío al laboratorio?',
        confirmDescription: 'La orden pasará a "Enviado a laboratorio". Asegúrate de que el mensajero ya salió con el empaque.',
      };
    case 'sent_to_lab':
    case 'in_transit':
    case 'received_from_lab':
    case 'in_quality':
      return {
        title: 'Esperando producto desde laboratorio',
        description: 'El laboratorio está fabricando el producto. Marca como listo cuando llegue a la sede.',
        buttonLabel: 'Marcar como listo',
        nextStatus: 'ready_for_delivery',
        confirmRequired: true,
        confirmTitle: '¿Marcar como listo para entregar?',
        confirmDescription: 'La orden pasará a "Listo para entregar". Confirma que el producto llegó a la sede en buen estado.',
      };
    case 'ready_for_delivery':
      return {
        title: 'Coordinar entrega al paciente',
        description: `La orden está lista en sede.${order.drawer_number ? ` Cajón #${order.drawer_number}.` : ''} Marca como entregada cuando el paciente confirme la recepción.`,
        buttonLabel: 'Marcar como entregada',
        nextStatus: 'delivered',
        confirmRequired: true,
        confirmTitle: '¿Marcar como entregada?',
        confirmDescription: 'La orden pasará a "Entregada". Esta acción cierra el ciclo de la orden en el sistema.',
      };
    case 'delivered':
      return null;
    case 'cancelled':
      return null;
    default:
      return null;
  }
}

const AdminLabOrderSidebar: React.FC<AdminLabOrderSidebarProps> = ({ order, onStatusUpdate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const actionConfig = getActionConfig(order.status, order);

  const handleAction = async () => {
    if (!actionConfig) return;
    setLoading(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(order.id, {
        status: actionConfig.nextStatus,
      });
      toast({ title: 'Estado actualizado', description: `La orden cambió a "${actionConfig.buttonLabel}".` });
      onStatusUpdate();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleButtonClick = () => {
    if (actionConfig?.confirmRequired) {
      setConfirmOpen(true);
    } else {
      handleAction();
    }
  };

  return (
    <div className="space-y-4">
      {actionConfig ? (
        <Card>
          <CardContent className="pt-5 pb-6 px-5">
            <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-1">
              Próxima acción
            </p>
            <p className="text-[14px] font-semibold text-[#121215]">{actionConfig.title}</p>
            <p className="text-[12px] text-[#7d7d87] mt-1.5 leading-[1.5]">{actionConfig.description}</p>
            <Button
              className="w-full mt-4 bg-[#3a71f7] hover:bg-[#2d5fd6] text-white h-10 text-[13px] font-semibold"
              onClick={handleButtonClick}
              disabled={loading}
            >
              {loading ? 'Procesando...' : actionConfig.buttonLabel}
            </Button>
          </CardContent>
        </Card>
      ) : order.status === 'delivered' ? (
        <Card>
          <CardContent className="pt-5 pb-6 px-5">
            <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-1">
              Estado final
            </p>
            <p className="text-[14px] font-semibold text-[#228b52]">Orden entregada</p>
            <p className="text-[12px] text-[#7d7d87] mt-1.5">
              La orden fue entregada exitosamente al paciente. El proceso ha finalizado.
            </p>
          </CardContent>
        </Card>
      ) : order.status === 'cancelled' ? (
        <Card>
          <CardContent className="pt-5 pb-6 px-5">
            <p className="text-[10px] font-semibold text-[#7d7d87] uppercase tracking-wide mb-1">
              Estado final
            </p>
            <p className="text-[14px] font-semibold text-red-600">Orden cancelada</p>
            <p className="text-[12px] text-[#7d7d87] mt-1.5">
              La orden fue cancelada. Revisa el motivo en el historial de seguimiento.
            </p>
          </CardContent>
        </Card>
      ) : null}

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

      {actionConfig?.confirmRequired && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={actionConfig.confirmTitle ?? 'Confirmar accion'}
          description={actionConfig.confirmDescription ?? ''}
          confirmLabel="Confirmar"
          variant="default"
          onConfirm={handleAction}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default AdminLabOrderSidebar;
