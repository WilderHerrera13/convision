import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ArrowLeft } from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDate, safeDateFormat } from '@/lib/utils';

const getStatusVariant = (status: string) => {
  if (status === 'pending') return 'warning';
  if (status === 'in_process') return 'info';
  if (status === 'sent_to_lab') return 'secondary';
  if (status === 'ready_for_delivery') return 'success';
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'destructive';
  return 'default';
};

const getStatusLabel = (status: string) => {
  if (status === 'pending') return 'Pendiente';
  if (status === 'in_process') return 'En proceso';
  if (status === 'sent_to_lab') return 'Enviado a laboratorio';
  if (status === 'ready_for_delivery') return 'Listo para entregar';
  if (status === 'delivered') return 'Entregado';
  if (status === 'cancelled') return 'Cancelado';
  return status;
};

const getPriorityVariant = (priority: string) => {
  if (priority === 'low') return 'outline';
  if (priority === 'normal') return 'default';
  if (priority === 'high') return 'warning';
  if (priority === 'urgent') return 'destructive';
  return 'default';
};

const getPriorityLabel = (priority: string) => {
  if (priority === 'low') return 'Baja';
  if (priority === 'normal') return 'Normal';
  if (priority === 'high') return 'Alta';
  if (priority === 'urgent') return 'Urgente';
  return priority;
};

const LaboratoryOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) {
          setError('ID inválido');
          setLoading(false);
          return;
        }
        const data = await laboratoryOrderService.getLaboratoryOrder(Number(id));
        setOrder(data);
      } catch (e) {
        setError('No se pudo cargar la orden de laboratorio');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDownloadPdf = () => {
    if (!order?.id || !order?.pdf_token) return;
    const url = laboratoryOrderService.getLaboratoryOrderPdfUrl(order.id, order.pdf_token);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/laboratory-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h2 className="text-2xl font-bold">Detalle de Orden de Laboratorio</h2>
        </div>
        {order?.pdf_token && (
          <Button onClick={handleDownloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Información general de la orden</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">Cargando...</div>
          ) : error ? (
            <div className="py-8 text-red-500">{error}</div>
          ) : order ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número de Orden</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laboratorio</p>
                <p className="font-medium">{order.laboratory?.name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paciente</p>
                <p className="font-medium">
                  {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={getStatusVariant(order.status)}>{getStatusLabel(order.status)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <Badge variant={getPriorityVariant(order.priority)}>{getPriorityLabel(order.priority)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">{order.created_at ? formatDate(order.created_at) : '—'}</p>
              </div>
            </div>
          ) : (
            <div className="py-8">No se encontró la orden</div>
          )}
        </CardContent>
      </Card>

      {order?.order?.items && order.order.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ítems</CardTitle>
            <CardDescription>Productos asociados a la orden</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Tratamiento</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.lens?.description || '—'}</TableCell>
                    <TableCell>{it.lens?.brand?.name || '—'}</TableCell>
                    <TableCell>{it.lens?.material?.name || '—'}</TableCell>
                    <TableCell>{it.lens?.treatment?.name || '—'}</TableCell>
                    <TableCell>{it.lens?.lensType?.name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {order?.statusHistory && order.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Estados</CardTitle>
            <CardDescription>Registro de cambios de estado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.statusHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{safeDateFormat(h.created_at, 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(h.status)}>{getStatusLabel(h.status)}</Badge>
                    </TableCell>
                    <TableCell>{h.notes || '—'}</TableCell>
                    <TableCell>{h.user?.name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LaboratoryOrderDetail;


