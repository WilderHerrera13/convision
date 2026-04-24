import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import PageLayout from '@/components/layouts/PageLayout';
import DeliveryPaymentTab, { PaymentFormState } from './DeliveryPaymentTab';
import DeliveryInfoTab, { DeliveryFormState } from './DeliveryInfoTab';

const ConfirmDelivery: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [payment, setPayment] = useState<PaymentFormState>({
    paymentMethod: '',
    amount: '',
    check1: false,
    check2: false,
  });
  const [paymentErrors, setPaymentErrors] = useState<
    Partial<Record<keyof PaymentFormState, string>>
  >({});

  const [delivery, setDelivery] = useState<DeliveryFormState>({
    recipient: '',
    documentType: '',
    documentNumber: '',
    deliveryTime: '',
    productCondition: '',
    check1: true,
    check2: true,
    check3: false,
  });
  const [deliveryErrors, setDeliveryErrors] = useState<
    Partial<Record<keyof DeliveryFormState, string>>
  >({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    laboratoryOrderService
      .getLaboratoryOrder(Number(id))
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  const validate = (): boolean => {
    const pErr: Partial<Record<keyof PaymentFormState, string>> = {};
    const dErr: Partial<Record<keyof DeliveryFormState, string>> = {};
    if (!payment.paymentMethod) pErr.paymentMethod = 'Seleccione forma de pago';
    if (!payment.amount.trim()) pErr.amount = 'Ingrese el valor recibido';
    if (!payment.check1) pErr.check1 = 'Confirmación requerida';
    if (!payment.check2) pErr.check2 = 'Confirmación requerida';
    if (!delivery.recipient) dErr.recipient = 'Seleccione quién retira';
    if (!delivery.documentType) dErr.documentType = 'Seleccione tipo de documento';
    if (!delivery.documentNumber.trim()) dErr.documentNumber = 'Ingrese número de documento';
    if (!delivery.deliveryTime) dErr.deliveryTime = 'Ingrese hora de entrega';
    if (!delivery.productCondition) dErr.productCondition = 'Seleccione estado del producto';
    setPaymentErrors(pErr);
    setDeliveryErrors(dErr);
    return Object.keys(pErr).length === 0 && Object.keys(dErr).length === 0;
  };

  const handleConfirm = async () => {
    if (!id || !validate()) return;
    setSubmitting(true);
    try {
      const notes = [
        `Pago: ${payment.paymentMethod}`,
        `Valor: ${payment.amount}`,
        `Retira: ${delivery.recipient === 'titular' ? 'Titular' : 'Otra persona'}`,
        `Doc: ${delivery.documentType} ${delivery.documentNumber}`,
        `Condición: ${delivery.productCondition}`,
      ].join(' | ');
      await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), {
        status: 'delivered',
        notes,
      });
      toast({ title: '¡Entrega confirmada exitosamente!' });
      navigate('/receptionist/lab-orders');
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo confirmar la entrega.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const lastNotified = order?.statusHistory?.find((h) => h.status === 'ready_for_delivery');
  const notifiedDate = lastNotified
    ? new Date(lastNotified.created_at).toLocaleDateString('es-CO')
    : null;

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
        disabled={submitting}
        onClick={handleConfirm}
        className="bg-[#8753ef] hover:bg-[#7040d6] text-white"
      >
        {submitting ? 'Confirmando...' : 'Confirmar Entrega'}
      </Button>
    </div>
  );

  return (
    <PageLayout
      title="Confirmar Entrega y Pago"
      subtitle={order ? `Órdenes de Laboratorio / ${order.order_number}` : 'Órdenes de Laboratorio'}
      actions={actions}
    >
      {loading && <div className="py-8 text-center text-muted-foreground">Cargando...</div>}
      {!loading && order && (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="payment">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="payment" className="flex-1">
                  Registrar Pago
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex-1">
                  Datos de Entrega
                </TabsTrigger>
              </TabsList>
              <TabsContent value="payment">
                <DeliveryPaymentTab
                  order={order}
                  state={payment}
                  onChange={(p) => setPayment((prev) => ({ ...prev, ...p }))}
                  errors={paymentErrors}
                />
              </TabsContent>
              <TabsContent value="delivery">
                <DeliveryInfoTab
                  order={order}
                  state={delivery}
                  onChange={(p) => setDelivery((prev) => ({ ...prev, ...p }))}
                  errors={deliveryErrors}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-[272px] shrink-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Estado actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                  Listo para entrega
                </Badge>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Cajón asignado</p>
                  <p className="font-medium">
                    {order.drawer_number ? `Cajón #${order.drawer_number}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Cliente notificado</p>
                  <p className="font-medium text-xs">
                    {notifiedDate ? `el ${notifiedDate}` : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#f1edff] border-[#8753ef]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#8753ef]">
                  Al confirmar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#5c3aaa] leading-relaxed space-y-1.5">
                <p>• La orden cambia a estado &quot;Entregado&quot;.</p>
                <p>• Se registra el método de pago y valor recibido.</p>
                <p>• Se guarda la identidad de quien retiró el producto.</p>
                <p>• El cajón queda liberado para nuevas órdenes.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ConfirmDelivery;
