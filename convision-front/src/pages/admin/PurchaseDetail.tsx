import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  ShoppingCart,
  CreditCard,
  User,
} from 'lucide-react';
import { purchaseService } from '@/services/purchaseService';

const PurchaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchaseService.getPurchase(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando detalles de la compra...</p>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">Error al cargar la compra</p>
          <Button variant="outline" onClick={() => navigate('/admin/purchases')} className="mt-2">
            Volver a Compras
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Pagado</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
      case 'pending':
        return <Badge variant="destructive">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/purchases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Compra</h1>
            <p className="text-muted-foreground">
              Factura N° {purchase.invoice_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(purchase.status)}
          <Button onClick={() => navigate(`/admin/purchases/${purchase.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">N° Factura</p>
                <p className="font-medium">{purchase.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Compra</p>
                <p className="font-medium">{formatDate(purchase.purchase_date)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Concepto</p>
              <p className="font-medium">{purchase.concept}</p>
            </div>

            {purchase.payment_due_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Vencimiento</p>
                <p className="font-medium">{formatDate(purchase.payment_due_date)}</p>
              </div>
            )}

            {purchase.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notas</p>
                <p className="text-sm">{purchase.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Impuestos:</p>
              {purchase.tax_excluded ? (
                <Badge variant="outline">Excluidos</Badge>
              ) : (
                <Badge variant="secondary">Incluidos</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información del Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nombre</p>
              <p className="font-medium">{purchase.supplier?.name || 'N/A'}</p>
            </div>
            {purchase.supplier?.nit && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">NIT</p>
                <p className="font-medium">{purchase.supplier.nit}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(purchase.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuestos:</span>
              <span className="font-medium">{formatCurrency(purchase.tax_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retención:</span>
              <span className="font-medium">{formatCurrency(purchase.retention_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(purchase.total_amount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Pagado:</span>
              <span className="font-medium">{formatCurrency(purchase.payment_amount)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Saldo:</span>
              <span className="font-medium">{formatCurrency(purchase.balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Created By */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información de Registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Creado por</p>
              <p className="font-medium">{purchase.created_by?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
              <p className="font-medium">{formatDate(purchase.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Última actualización</p>
              <p className="font-medium">{formatDate(purchase.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      {purchase.items && purchase.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ítems de la Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product_description}</p>
                        {item.product?.code && (
                          <p className="text-sm text-muted-foreground">Código: {item.product.code}</p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      {purchase.payments && purchase.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Registrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.payments.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>{payment.payment_method?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell>{payment.created_by?.name || 'N/A'}</TableCell>
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

export default PurchaseDetail; 