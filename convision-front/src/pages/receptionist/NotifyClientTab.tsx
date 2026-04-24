import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';

interface NotifyClientTabProps {
  order: LaboratoryOrder;
  selectedDrawer: string;
}

const NotifyClientTab: React.FC<NotifyClientTabProps> = ({ order, selectedDrawer }) => {
  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '';

  const orderRef = selectedDrawer
    ? `${order.order_number} (Cajón #${selectedDrawer})`
    : order.order_number;

  const [message, setMessage] = useState(
    `Estimado/a ${patientName || 'paciente'}, su pedido ${orderRef} está listo. Por favor acérquese a recogerlo.`,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Datos del paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Nombre</p>
            <p className="font-medium">{patientName || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Teléfono</p>
            <p className="font-medium">{order.patient?.phone ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Mensaje de notificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            type="button"
            variant="outline"
            className="border-[#8753ef] text-[#8753ef] hover:bg-[#f1edff] hover:text-[#8753ef]"
          >
            Enviar mensaje
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotifyClientTab;
