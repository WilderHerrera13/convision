import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { purchaseService, type Purchase } from '@/services/purchaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 0
}).format(amount || 0);

const SupplierPaymentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<{ data: Purchase }>({
    queryKey: ['purchase-detail', id],
    queryFn: async () => ({ data: await purchaseService.getPurchase(Number(id)) }),
    enabled: !!id,
  });

  const purchase = data?.data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/supplier-payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <h1 className="text-3xl font-bold">Detalle de Pago a Proveedor</h1>
      </div>

      {isLoading && <div>Cargando...</div>}
      {error && <div>Error al cargar el detalle.</div>}

      {purchase && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información de la Compra</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Proveedor</div>
                <div className="font-medium">{purchase.supplier?.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Factura</div>
                <div className="font-medium">{purchase.invoice_number}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Estado de Pago</div>
                <div className="font-medium">{purchase.payment_status}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pagado</div>
                <div className="font-medium">{formatCurrency(purchase.payment_amount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Saldo</div>
                <div className="font-medium">{formatCurrency(purchase.balance)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagos Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchase.payments || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Sin pagos</TableCell>
                    </TableRow>
                  ) : (
                    (purchase.payments || []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.payment_date}</TableCell>
                        <TableCell>{p.payment_method?.name || '—'}</TableCell>
                        <TableCell>{p.reference || '—'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SupplierPaymentDetail;


