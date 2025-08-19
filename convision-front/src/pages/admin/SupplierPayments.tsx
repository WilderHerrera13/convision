import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Filter, Eye, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface SupplierPayment {
  id: number;
  supplier_name: string;
  invoice_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
}

export default function SupplierPayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<SupplierPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch supplier payments
      const mockPayments: SupplierPayment[] = [
        {
          id: 1,
          supplier_name: 'Proveedor ABC',
          invoice_number: 'INV-001',
          amount: 1500000,
          payment_date: '2024-01-15',
          payment_method: 'Transferencia',
          status: 'paid',
          due_date: '2024-01-15'
        },
        {
          id: 2,
          supplier_name: 'Proveedor XYZ',
          invoice_number: 'INV-002',
          amount: 2300000,
          payment_date: '',
          payment_method: '',
          status: 'pending',
          due_date: '2024-01-20'
        },
        {
          id: 3,
          supplier_name: 'Proveedor DEF',
          invoice_number: 'INV-003',
          amount: 890000,
          payment_date: '',
          payment_method: '',
          status: 'overdue',
          due_date: '2024-01-10'
        }
      ];

      setPayments(mockPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error("Error al cargar los pagos");
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

  const handlePayment = async (paymentId: number) => {
    try {
      // TODO: Implement payment processing
      console.log('Processing payment:', paymentId);
      toast.success("Pago procesado exitosamente");
      fetchPayments(); // Refresh the list
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error("Error al procesar el pago");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Pagos a Proveedores</h1>
        </div>
        <Button onClick={() => navigate('/admin/supplier-payments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pago
        </Button>
      </div>

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
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.supplier_name}</TableCell>
                    <TableCell>{payment.invoice_number}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/supplier-payments/${payment.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payment.status !== 'paid' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePayment(payment.id)}
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
    </div>
  );
} 