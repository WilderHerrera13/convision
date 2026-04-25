import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import {
  Plus,
  Filter,
  Download,
  DollarSign,
  Calendar,
  CreditCard,
  Eye,
  FileText
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { saleService, Sale, SaleStats, SaleFilterParams } from '@/services/saleService';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/layouts/PageLayout';
import { PDFViewer } from '@/components/ui/pdf-viewer';

const Sales: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: todayStats } = useQuery<SaleStats>({
    queryKey: ['sale-stats-today'],
    queryFn: () => saleService.getTodayStats(),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => saleService.getPaymentMethods(),
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [cancelSaleTarget, setCancelSaleTarget] = useState<number | null>(null);
  const [removePaymentTarget, setRemovePaymentTarget] = useState<{ saleId: number; paymentId: number } | null>(null);

  const [filters, setFilters] = useState<SaleFilterParams>({
    status: '',
    payment_status: '',
    date_from: '',
    date_to: '',
    patient_id: undefined,
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentNotes, setPaymentNotes] = useState('');

  const handleAddPayment = (sale: Sale) => {
    setCurrentSale(sale);
    setPaymentAmount(sale.balance.toString());
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('');
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleDownloadInvoice = async (sale: Sale) => {
    try {
      await saleService.downloadSalePdfSecure(sale.id, sale.sale_number);
    } catch {
      toast({ title: 'Error', description: 'No se pudo descargar la factura.', variant: 'destructive' });
    }
  };

  const handleCancelSale = async () => {
    if (!cancelSaleTarget) return;
    const id = cancelSaleTarget;
    setCancelSaleTarget(null);
    try {
      await saleService.cancelSale(id);
      toast({ title: 'Venta cancelada', description: 'La venta ha sido cancelada exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-stats-today'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo cancelar la venta.', variant: 'destructive' });
    }
  };

  const handleRemovePayment = async () => {
    if (!removePaymentTarget) return;
    const { saleId, paymentId } = removePaymentTarget;
    setRemovePaymentTarget(null);
    try {
      await saleService.removePayment(saleId, paymentId);
      toast({ title: 'Pago eliminado', description: 'El pago ha sido eliminado exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-stats-today'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el pago.', variant: 'destructive' });
    }
  };

  const submitPayment = async () => {
    if (!currentSale) return;
    if (!paymentMethod || !paymentAmount || !paymentDate) {
      toast({ title: 'Error', description: 'Todos los campos marcados son obligatorios.', variant: 'destructive' });
      return;
    }
    const selectedMethod = paymentMethods.find((pm: any) => pm.id.toString() === paymentMethod);
    if (selectedMethod?.requires_reference && !paymentReference) {
      toast({ title: 'Error', description: 'El número de referencia es requerido para este método de pago.', variant: 'destructive' });
      return;
    }
    try {
      await saleService.addPayment(currentSale.id, {
        payment_method_id: parseInt(paymentMethod),
        amount: parseFloat(paymentAmount),
        reference_number: paymentReference || undefined,
        payment_date: paymentDate,
        notes: paymentNotes || undefined,
      });
      toast({ title: 'Pago agregado', description: 'El pago ha sido agregado exitosamente.' });
      setPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-stats-today'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar el pago.', variant: 'destructive' });
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', payment_status: '', date_from: '', date_to: '', patient_id: undefined });
  };

  const handlePreviewInvoice = async (sale: Sale) => {
    try {
      setCurrentSale(sale);
      const { token } = await saleService.getPdfToken(sale.id);
      const previewUrl = saleService.getSalePdfPreviewUrl(sale.id, token);
      setPdfPreviewUrl(previewUrl);
      setPdfPreviewOpen(true);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la vista previa de la factura.', variant: 'destructive' });
    }
  };

  const columns: DataTableColumnDef<Sale>[] = [
    {
      id: 'sale_number',
      header: 'Factura',
      type: 'text',
      accessorKey: 'sale_number',
      cell: (sale) => sale.sale_number
        ? <span className="font-medium text-blue-600">{sale.sale_number}</span>
        : '—'
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row) => row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : '—',
      cell: (sale) => !sale.patient ? '—' : (
        <div className="flex flex-col">
          <span className="font-medium">{sale.patient.first_name} {sale.patient.last_name}</span>
          {sale.patient.identification && (
            <span className="text-xs text-gray-500">ID: {sale.patient.identification}</span>
          )}
        </div>
      )
    },
    { id: 'created_at', header: 'Fecha', type: 'date', accessorKey: 'created_at', className: 'whitespace-nowrap' },
    { id: 'total', header: 'Total', type: 'money', accessorKey: 'total', className: 'text-right font-medium' },
    { id: 'amount_paid', header: 'Pagado', type: 'money', accessorKey: 'amount_paid', className: 'text-right font-medium text-green-600' },
    {
      id: 'balance',
      header: 'Saldo',
      type: 'money',
      accessorKey: 'balance',
      className: 'text-right font-medium',
      cell: (sale) => (
        <span className={sale.balance > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
          {formatCurrency(sale.balance)}
        </span>
      )
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (sale) => {
        if (sale.status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (sale.status === 'completed') return <Badge variant="success">Completada</Badge>;
        if (sale.status === 'cancelled') return <Badge variant="destructive">Cancelada</Badge>;
        return <span>—</span>;
      }
    },
    {
      id: 'payment_status',
      header: 'Pago',
      type: 'text',
      accessorKey: 'payment_status',
      cell: (sale) => {
        if (sale.payment_status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (sale.payment_status === 'partial') return <Badge variant="info">Parcial</Badge>;
        if (sale.payment_status === 'paid') return <Badge variant="success">Pagada</Badge>;
        if (sale.payment_status === 'refunded') return <Badge variant="secondary">Reembolsada</Badge>;
        return <span>—</span>;
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (sale) => (
        <div className="flex space-x-2 justify-end">
          <Button variant="outline" size="sm" className="flex items-center" onClick={() => handlePreviewInvoice(sale)}>
            <FileText className="h-4 w-4 mr-1" />
            Ver Factura
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => {
              const basePath = user?.role === 'admin' ? '/admin' : '/receptionist';
              navigate(`${basePath}/sales/${sale.id}`);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        </div>
      )
    }
  ];

  return (
    <PageLayout title="Gestión de Ventas">
      <div className="space-y-6">
        {todayStats && (
          <>
            <div className="flex items-center mt-6 mb-4">
              <h2 className="text-xl font-semibold">Ventas del Día ({format(new Date(), 'dd/MM/yyyy')})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Ventas Hoy</p>
                      <h2 className="text-3xl font-bold">{todayStats.total_sales || 0}</h2>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ingresos Hoy</p>
                      <h2 className="text-3xl font-bold">{formatCurrency(todayStats.total_revenue || 0)}</h2>
                      <p className="text-xs text-muted-foreground mt-1">Cobrado: {formatCurrency(todayStats.collected_amount || 0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-orange-500">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Por Cobrar Hoy</p>
                      <h2 className="text-3xl font-bold">{formatCurrency(todayStats.pending_balance || 0)}</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {todayStats.total_revenue > 0
                          ? `${((todayStats.pending_balance / todayStats.total_revenue) * 100).toFixed(1)}% del total`
                          : "0.0% del total"}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-purple-500">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado de Pagos Hoy</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        Pagadas: {todayStats.payment_status_breakdown?.paid || 0}
                      </Badge>
                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                        Parcial: {todayStats.payment_status_breakdown?.partial || 0}
                      </Badge>
                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                        Pendiente: {todayStats.payment_status_breakdown?.pending || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <EntityTable<Sale>
          columns={columns}
          fetcher={async (params) => {
            const result = await saleService.getSales({
              page: params.page,
              per_page: params.per_page,
              search: params.search || undefined,
              status: filters.status || undefined,
              payment_status: filters.payment_status || undefined,
              date_from: filters.date_from || undefined,
              date_to: filters.date_to || undefined,
              patient_id: filters.patient_id,
            });
            return { data: result.data, last_page: result.last_page, total: result.total };
          }}
          queryKeyBase="sales"
          extraFilters={{ status: filters.status, payment_status: filters.payment_status, date_from: filters.date_from, date_to: filters.date_to, patient_id: filters.patient_id }}
          searchPlaceholder="Buscar venta..."
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Ventas</span>
              <span className="text-[11px] text-[#7d7d87]">Listado de ventas</span>
            </div>
          }
          toolbarTrailing={
            <>
              <Button variant="outline" size="sm" onClick={() => setFilterModalOpen(true)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button size="sm" onClick={() => navigate('/receptionist/sales/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Venta
              </Button>
            </>
          }
        />

        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Pago</DialogTitle>
              <DialogDescription>
                Venta: {currentSale?.sale_number} | Saldo: {formatCurrency(currentSale?.balance)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Método de Pago *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method: any) => (
                      <SelectItem key={method.id} value={method.id.toString()}>{method.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-amount">Monto *</Label>
                <Input id="payment-amount" type="number" step="0.01" min="0.01" max={currentSale?.balance} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </div>
              {paymentMethod && paymentMethods.find((pm: any) => pm.id.toString() === paymentMethod)?.requires_reference && (
                <div className="grid gap-2">
                  <Label htmlFor="payment-reference">Número de Referencia *</Label>
                  <Input id="payment-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="payment-date">Fecha de Pago *</Label>
                <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-notes">Notas</Label>
                <Input id="payment-notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
              <Button onClick={submitPayment}>Agregar Pago</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtrar Ventas</DialogTitle>
              <DialogDescription>Aplique filtros para encontrar ventas específicas</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="filter-status">Estado</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger id="filter-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter-payment-status">Estado de Pago</Label>
                <Select value={filters.payment_status} onValueChange={(value) => setFilters({ ...filters, payment_status: value })}>
                  <SelectTrigger id="filter-payment-status"><SelectValue placeholder="Todos los estados de pago" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="refunded">Reembolsada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter-date-from">Fecha Desde</Label>
                <Input id="filter-date-from" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter-date-to">Fecha Hasta</Label>
                <Input id="filter-date-to" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter-patient-id">ID del Paciente</Label>
                <Input
                  id="filter-patient-id"
                  placeholder="ID del paciente"
                  value={filters.patient_id || ''}
                  onChange={(e) => setFilters({ ...filters, patient_id: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={clearFilters}>Limpiar Filtros</Button>
              <Button onClick={() => setFilterModalOpen(false)}>Aplicar Filtros</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Vista Previa de Factura</DialogTitle>
              <DialogDescription>Previsualización del documento de factura</DialogDescription>
            </DialogHeader>
            <div className="w-full h-[calc(80vh-10rem)]">
              {pdfPreviewUrl && <PDFViewer url={pdfPreviewUrl} height="100%" />}
            </div>
            <DialogFooter>
              <Button onClick={() => setPdfPreviewOpen(false)}>Cerrar</Button>
              {currentSale && (
                <Button onClick={() => handleDownloadInvoice(currentSale)}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDialog
        open={cancelSaleTarget !== null}
        onOpenChange={(open) => { if (!open) setCancelSaleTarget(null); }}
        title="Cancelar venta"
        description="Esta acción no se puede deshacer. ¿Está seguro de cancelar esta venta?"
        confirmLabel="Cancelar venta"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={handleCancelSale}
      />

      <ConfirmDialog
        open={removePaymentTarget !== null}
        onOpenChange={(open) => { if (!open) setRemovePaymentTarget(null); }}
        title="Eliminar pago"
        description="Esta acción no se puede deshacer. ¿Está seguro de eliminar este pago?"
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        variant="danger"
        onConfirm={handleRemovePayment}
      />
    </PageLayout>
  );
};

export default Sales;
