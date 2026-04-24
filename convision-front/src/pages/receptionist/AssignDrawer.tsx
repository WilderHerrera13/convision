import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import AssignDrawerTab from './AssignDrawerTab';
import NotifyClientTab from './NotifyClientTab';

const AssignDrawer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [allOrders, setAllOrders] = useState<LaboratoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawer, setSelectedDrawer] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      laboratoryOrderService.getLaboratoryOrder(Number(id)),
      laboratoryOrderService.getLaboratoryOrders({ per_page: 100 }),
    ])
      .then(([orderData, ordersData]) => {
        setOrder(orderData);
        if (orderData.drawer_number) setSelectedDrawer(orderData.drawer_number);
        const list = Array.isArray(ordersData?.data) ? ordersData.data : [];
        setAllOrders(list);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkReady = async () => {
    if (!id || !selectedDrawer.trim()) return;
    setSubmitting(true);
    try {
      await laboratoryOrderService.updateLaboratoryOrder(Number(id), {
        drawer_number: selectedDrawer,
      } as any);
      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), {
        status: 'ready_for_delivery',
        notes: 'Cajón asignado: ' + selectedDrawer,
      });
      toast({ title: 'Cajón asignado', description: 'La orden está lista para entrega.' });
      navigate(`/receptionist/lab-orders/${id}`);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo asignar el cajón.',
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
        disabled={submitting || !selectedDrawer.trim()}
        onClick={handleMarkReady}
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
      >
        {submitting ? 'Guardando...' : 'Marcar como Listo'}
      </Button>
    </div>
  );

  return (
    <PageLayout
      title="Asignar Cajón y Notificar Cliente"
      subtitle={
        order
          ? `Órdenes de Laboratorio / ${order.order_number} / Listo para entrega`
          : 'Órdenes de Laboratorio'
      }
      actions={actions}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">Cargando...</div>
      ) : !order ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          Orden no encontrada.
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="drawer" className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="drawer" className="flex-1">
                  Asignar Cajón
                </TabsTrigger>
                <TabsTrigger value="notify" className="flex-1">
                  Notificar Cliente
                </TabsTrigger>
              </TabsList>
              <TabsContent value="drawer">
                <AssignDrawerTab
                  order={order}
                  allOrders={allOrders}
                  selectedDrawer={selectedDrawer}
                  onDrawerChange={setSelectedDrawer}
                />
              </TabsContent>
              <TabsContent value="notify">
                <NotifyClientTab order={order} selectedDrawer={selectedDrawer} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-[272px] shrink-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Contacto del cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Nombre</p>
                  <p className="font-medium">{patientName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Teléfono</p>
                  <p className="font-medium">{order.patient?.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Última llamada</p>
                  <p className="text-gray-400 text-xs">Sin llamadas previas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#f1edff] border-[#8753ef]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#8753ef]">
                  Próximo paso
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#5c3aaa] leading-relaxed">
                Asigna el cajón y luego ve a la pestaña &quot;Notificar Cliente&quot; para
                registrar la llamada de aviso al paciente. El lente queda en estado
                &quot;Listo para entrega&quot;.
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AssignDrawer;
