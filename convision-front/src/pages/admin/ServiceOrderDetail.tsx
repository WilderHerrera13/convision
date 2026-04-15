import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { serviceOrderService, ServiceOrder } from '@/services/serviceOrderService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Edit } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  delivered: 'success',
  cancelled: 'destructive',
};

const priorityVariant: Record<string, 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
};

const ServiceOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!id) throw new Error('ID inválido');
        const data = await serviceOrderService.getServiceOrder(Number(id));
        setOrder(data);
      } catch (e) {
        setError('No se pudo cargar la orden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/service-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h2 className="text-2xl font-bold">Detalle de Orden de Arreglo</h2>
        </div>
        {order && (
          <Button onClick={() => navigate(`/admin/service-orders/${order.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Información general</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Cargando...</div>
          ) : error ? (
            <div className="py-6 text-red-500">{error}</div>
          ) : order ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de servicio</p>
                <p className="font-medium">{order.service_type}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Problema</p>
                <p className="font-medium">{order.problem_description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo estimado</p>
                <p className="font-medium">{formatCurrency(order.estimated_cost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha límite</p>
                <p className="font-medium">{formatDate(order.deadline)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <Badge variant={priorityVariant[order.priority] || 'default'}>
                  {order.priority === 'low' ? 'Baja' : order.priority === 'high' ? 'Alta' : 'Media'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={statusVariant[order.status] || 'default'}>
                  {{ pending: 'Pendiente', in_progress: 'En Progreso', completed: 'Completado', delivered: 'Entregado', cancelled: 'Cancelado' }[order.status] || order.status}
                </Badge>
              </div>
              <div className="lg:col-span-3">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{order.notes || '—'}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceOrderDetail;


