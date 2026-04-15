import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Filter, Eye, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { purchaseService, type Purchase } from '@/services/purchaseService';
import { expenseService, type Expense } from '@/services/expenseService';
import { payrollService } from '@/services/payrollService';
import { supplierPaymentsService, type SupplierPayableRow } from '@/services/supplierPaymentsService';
import { DatePicker } from '@/components/ui/date-picker';
import PageLayout from '@/components/layouts/PageLayout';

interface SupplierPaymentRow {
  id: number;
  purchase_id: number;
  source: 'purchase' | 'expense';
  supplier_name: string;
  invoice_number: string;
  amount: number;
  payment_method?: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date?: string;
}

export default function SupplierPayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<SupplierPaymentRow[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<SupplierPaymentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [reference, setReference] = useState<string>('');

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => payrollService.getPaymentMethods(),
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const result = await supplierPaymentsService.list({ per_page: 100 });
      const rows: SupplierPaymentRow[] = result.data.map((r: SupplierPayableRow) => ({
        id: Number(r.source_id),
        purchase_id: r.source === 'purchase' ? r.source_id : 0,
        source: r.source,
        supplier_name: r.supplier?.name || '—',
        invoice_number: r.reference || '—',
        amount: r.balance,
        payment_method: undefined,
        status: r.status,
        due_date: r.due_date || undefined,
      }));
      setPayments(rows);
    } catch (error) {
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const openPayModal = async (purchaseId: number, source?: 'purchase' | 'expense') => {
    try {
      if (source === 'expense') {
        const expense = await expenseService.getExpense(purchaseId);
        setSelectedExpense(expense);
        setSelectedPurchase(null);
        setPaymentAmount(expense.balance || 0);
      } else {
        const purchase = await purchaseService.getPurchase(purchaseId);
        setSelectedPurchase(purchase);
        setSelectedExpense(null);
        setPaymentAmount(purchase.balance || 0);
      }
      setPaymentDate(new Date().toISOString().slice(0,10));
      setPaymentMethodId('');
      setReference('');
      setIsPayOpen(true);
    } catch {
      toast.error('No se pudo cargar el registro');
    }
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      if (paymentAmount <= 0 || !paymentDate || !paymentMethodId) return Promise.reject();
      if (selectedPurchase) {
        return purchaseService.addPayment(selectedPurchase.id, {
          payment_method_id: Number(paymentMethodId),
          amount: paymentAmount,
          payment_date: paymentDate,
          reference,
        });
      }
      if (selectedExpense) {
        return expenseService.addPayment(selectedExpense.id, {
          payment_method_id: Number(paymentMethodId),
          amount: paymentAmount,
          payment_date: paymentDate,
          reference,
        });
      }
      return Promise.reject();
    },
    onSuccess: () => {
      toast.success('Pago procesado exitosamente');
      setIsPayOpen(false);
      fetchPayments();
    },
    onError: () => {
      toast.error('Error al procesar el pago');
    }
  });

  return (
    <PageLayout
      title="Pagos a Proveedores"
      actions={
        <Button onClick={() => navigate('/admin/supplier-payments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pago
        </Button>
      }
    >
      <div className="space-y-6">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por proveedor o factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendiente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(
                  payments
                    .filter(p => p.status === 'pending')
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Vencido</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  payments
                    .filter(p => p.status === 'overdue')
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  payments
                    .filter(p => p.status === 'paid')
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total General</p>
              <p className="text-2xl font-bold">
                {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pagos</CardTitle>
          <CardDescription>
            Gestione los pagos a proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={`${payment.source}-${payment.id}`}>
                    <TableCell className="font-medium">{payment.supplier_name}</TableCell>
                    <TableCell>
                      {payment.source === 'purchase' ? 'Compra' : 'Gasto'}
                    </TableCell>
                    <TableCell>{payment.invoice_number}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.due_date ? new Date(payment.due_date).toLocaleDateString('es-CO') : '—'}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.source === 'purchase' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/supplier-payments/${payment.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {payment.status !== 'paid' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openPayModal(payment.purchase_id || payment.id, payment.source)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Proveedor</Label>
              <Input value={(selectedPurchase?.supplier?.name ?? selectedExpense?.supplier?.name) || ''} readOnly />
            </div>
            <div>
              <Label>Factura</Label>
              <Input value={(selectedPurchase?.invoice_number ?? selectedExpense?.invoice_number) || ''} readOnly />
            </div>
            <div>
              <Label>Saldo</Label>
              <Input value={formatCurrency(((selectedPurchase?.balance ?? selectedExpense?.balance) || 0))} readOnly />
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m: { id: number; name: string }) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Pago</Label>
              <DatePicker value={paymentDate} onChange={(d) => setPaymentDate(d ? d.toISOString().slice(0,10) : '')} useInputTrigger />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </div>
            <div className="md:col-span-2">
              <Label>Referencia</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayOpen(false)}>Cancelar</Button>
            <Button onClick={() => payMutation.mutate()} disabled={!paymentMethodId || paymentAmount <= 0 || !paymentDate}>Pagar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
} 