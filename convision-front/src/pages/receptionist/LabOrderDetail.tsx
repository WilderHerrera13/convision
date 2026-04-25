import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download } from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import PageLayout from '@/components/layouts/PageLayout';
import LabOrderHeader from './LabOrderHeader';
import LabOrderStatusTimeline from './LabOrderStatusTimeline';
import LabOrderSidebar from './LabOrderSidebar';

function getPrimaryAction(order: LaboratoryOrder, navigate: ReturnType<typeof useNavigate>) {
  const { id, status } = order;
  if (status === 'pending') {
    return (
      <Button
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
        size="sm"
        onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-shipment`)}
      >
        Confirmar Envío
      </Button>
    );
  }
  if (status === 'sent_to_lab' || status === 'in_transit') {
    return (
      <Button
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
        size="sm"
        onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-reception`)}
      >
        Confirmar Recepción
      </Button>
    );
  }
  if (status === 'in_quality') {
    return (
      <Button
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
        size="sm"
        onClick={() => navigate(`/receptionist/lab-orders/${id}/assign-drawer`)}
      >
        Asignar Cajón
      </Button>
    );
  }
  if (status === 'ready_for_delivery') {
    return (
      <Button
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
        size="sm"
        onClick={() => navigate(`/receptionist/lab-orders/${id}/confirm-delivery`)}
      >
        Confirmar Entrega
      </Button>
    );
  }
  return null;
}

const LabOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) { setError('ID inválido'); setLoading(false); return; }
      const data = await laboratoryOrderService.getLaboratoryOrder(Number(id));
      setOrder(data);
    } catch {
      setError('No se pudo cargar la orden de laboratorio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleDownloadPdf = () => {
    if (!order?.id || !order?.pdf_token) return;
    const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, order.pdf_token);
    window.open(url, '_blank');
  };

  const lensItem = order?.order?.items?.[0]?.lens;
  const patientName = order?.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';

  const topActions = order ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate('/receptionist/lab-orders')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      {order.pdf_token && (
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-1" /> Descargar PDF
        </Button>
      )}
      {getPrimaryAction(order, navigate)}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate('/receptionist/lab-orders')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <PageLayout
        title={order ? `Detalle de Orden ${order.order_number}` : 'Detalle de Orden'}
        subtitle="Órdenes de Laboratorio"
        actions={topActions}
      >
        {loading && <div className="py-8 text-center text-muted-foreground">Cargando...</div>}
        {error && <div className="py-8 text-center text-red-500">{error}</div>}
        {!loading && !error && order && (
          <div className="space-y-6 pb-28">
            <LabOrderHeader order={order} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Datos del lente</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Especificaciones técnicas y origen de la orden
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Paciente</p>
                        <p className="text-sm font-medium">{patientName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Identificación</p>
                        <p className="text-sm font-medium">{order.patient?.identification || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Teléfono</p>
                        <p className="text-sm font-medium">{order.patient?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sede destino</p>
                        <p className="text-sm font-medium">—</p>
                      </div>
                    </div>
                    <div className="h-px bg-[#e5e5e9]" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Laboratorio</p>
                        <p className="text-sm font-medium">{order.laboratory?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de lente</p>
                        <p className="text-sm font-medium">{lensItem?.lensType?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Material</p>
                        <p className="text-sm font-medium">{lensItem?.material?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Graduación</p>
                        <p className="text-sm font-medium">—</p>
                      </div>
                    </div>
                    {order.notes && (
                      <>
                        <div className="h-px bg-[#e5e5e9]" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Descripción del pedido</p>
                          <p className="text-sm text-[#0f0f12]">{order.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {order.statusHistory && order.statusHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Historial de la orden</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Cronología completa de cambios de estado
                      </p>
                    </CardHeader>
                    <CardContent>
                      <LabOrderStatusTimeline history={order.statusHistory} />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="sticky top-4">
                <LabOrderSidebar order={order} onStatusUpdate={fetchOrder} />
              </div>
            </div>
          </div>
        )}
      </PageLayout>

      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#e5e5e9] px-6 py-4 z-10">
        <p className="text-sm text-[#7d7d87]">
          Las acciones cambian el estado de la orden y quedan registradas en el historial.
        </p>
      </div>
    </div>
  );
};

export default LabOrderDetail;
