import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Download, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  FileText
} from 'lucide-react';
import { saleService, Sale, PaymentMethod, SaleStats, SaleFilterParams } from '@/services/saleService';
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PDFViewer } from '@/components/ui/pdf-viewer';

// Override Badge variants to include the ones we need
interface BadgeVariantProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info';
}

// Badge variants for statuses
const getStatusColor = (status: string): BadgeVariantProps['variant'] => {
  switch (status) {
    case 'pending': return 'warning';
    case 'completed': return 'success';
    case 'cancelled': return 'destructive';
    case 'partial': return 'info';
    case 'paid': return 'success';
    case 'refunded': return 'secondary';
    default: return 'default';
  }
};

const Sales: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [todayStats, setTodayStats] = useState<SaleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [filters, setFilters] = useState<SaleFilterParams>({
    status: '',
    payment_status: '',
    date_from: '',
    date_to: '',
    patient_id: undefined,
  });
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [perPage, setPerPage] = useState(10);

  // Load sales on component mount and filter changes
  useEffect(() => {
    fetchSales();
    fetchTodayStats();
    fetchPaymentMethods();
  }, [currentPage, perPage, filters]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      // Create params with current page and per_page
      const params: SaleFilterParams = {
        page: currentPage,
        per_page: perPage,
      };
      
      // Only add filter values that aren't empty strings
      if (filters.status) params.status = filters.status;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.date_from && filters.date_from !== '') params.date_from = filters.date_from;
      if (filters.date_to && filters.date_to !== '') params.date_to = filters.date_to;
      if (filters.patient_id) params.patient_id = filters.patient_id;

      const response = await saleService.getSales(params);
      setSales(response.data);
      setTotalPages(response.last_page);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const todayStatsData = await saleService.getTodayStats();
      setTodayStats(todayStatsData);
    } catch (error) {
      console.error('Error fetching today\'s stats:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const methods = await saleService.getPaymentMethods();
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([]);
    }
  };

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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar la factura.',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSale = async (id: number) => {
    if (!confirm('¿Está seguro de cancelar esta venta?')) {
      return;
    }
    
    try {
      await saleService.cancelSale(id);
      toast({
        title: 'Venta cancelada',
        description: 'La venta ha sido cancelada exitosamente.',
      });
      fetchSales();
      fetchTodayStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la venta.',
        variant: 'destructive'
      });
    }
  };

  const handleRemovePayment = async (saleId: number, paymentId: number) => {
    if (!confirm('¿Está seguro de eliminar este pago?')) {
      return;
    }

    try {
      await saleService.removePayment(saleId, paymentId);
      toast({
        title: 'Pago eliminado',
        description: 'El pago ha sido eliminado exitosamente.',
      });
      fetchSales();
      fetchTodayStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el pago.',
        variant: 'destructive'
      });
    }
  };

  const submitPayment = async () => {
    if (!currentSale) return;
    
    if (!paymentMethod || !paymentAmount || !paymentDate) {
      toast({
        title: 'Error',
        description: 'Todos los campos marcados son obligatorios.',
        variant: 'destructive'
      });
      return;
    }
    
    const selectedMethod = Array.isArray(paymentMethods) ? paymentMethods.find(pm => pm.id.toString() === paymentMethod) : null;
    
    if (selectedMethod?.requires_reference && !paymentReference) {
      toast({
        title: 'Error',
        description: 'El número de referencia es requerido para este método de pago.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await saleService.addPayment(currentSale.id, {
        payment_method_id: parseInt(paymentMethod),
        amount: parseFloat(paymentAmount),
        reference_number: paymentReference || undefined,
        payment_date: paymentDate,
        notes: paymentNotes || undefined
      });
      
      toast({
        title: 'Pago agregado',
        description: 'El pago ha sido agregado exitosamente.',
      });
      
      setPaymentModalOpen(false);
      fetchSales();
      fetchTodayStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el pago.',
        variant: 'destructive'
      });
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchSales();
    setFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      payment_status: '',
      date_from: '',
      date_to: '',
      patient_id: undefined,
    });
    setCurrentPage(1);
  };

  const goToNewSale = () => {
    navigate('/receptionist/sales/new');
  };

  const updatePatientIdFilter = (value: string) => {
    setFilters({
      ...filters,
      patient_id: value ? parseInt(value) : undefined
    });
  };

  const handlePreviewInvoice = async (sale: Sale) => {
    try {
      // Set the current sale for download button in the modal
      setCurrentSale(sale);
      // Get a token for the PDF
      const { token } = await saleService.getPdfToken(sale.id);
      // Generate a preview URL
      const previewUrl = saleService.getSalePdfPreviewUrl(sale.id, token);
      // Set the URL and open the modal
      setPdfPreviewUrl(previewUrl);
      setPdfPreviewOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la vista previa de la factura.',
        variant: 'destructive'
      });
    }
  };

  // Define columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'sale_number',
      header: 'Factura',
      type: 'text',
      accessorKey: 'sale_number',
      cell: ({ row }) => {
        const sale = row.original;
        return sale.sale_number ? (
          <span className="font-medium text-blue-600">{sale.sale_number}</span>
        ) : (
          '—'
        );
      }
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row) => {
        const patient = row.patient;
        if (!patient) return '—';
        return `${patient.first_name} ${patient.last_name}`;
      },
      cell: ({ row }) => {
        const sale = row.original;
        if (!sale.patient) return '—';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{sale.patient.first_name} {sale.patient.last_name}</span>
            {sale.patient.identification && (
              <span className="text-xs text-gray-500">ID: {sale.patient.identification}</span>
            )}
          </div>
        );
      }
    },
    {
      id: 'created_at',
      header: 'Fecha',
      type: 'date',
      accessorKey: 'created_at',
      className: 'whitespace-nowrap'
    },
    {
      id: 'total',
      header: 'Total',
      type: 'money',
      accessorKey: 'total',
      className: 'text-right font-medium'
    },
    {
      id: 'amount_paid',
      header: 'Pagado',
      type: 'money',
      accessorKey: 'amount_paid',
      className: 'text-right font-medium text-green-600'
    },
    {
      id: 'balance',
      header: 'Saldo',
      type: 'money',
      accessorKey: 'balance',
      className: 'text-right font-medium',
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <span className={sale.balance > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
            {formatCurrency(sale.balance)}
          </span>
        );
      }
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        
        // Direct mapping without any conditional logic
        if (status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (status === 'completed') return <Badge variant="success">Completada</Badge>;
        if (status === 'cancelled') return <Badge variant="destructive">Cancelada</Badge>;
        
        // Default fallback
        return <span>—</span>;
      }
    },
    {
      id: 'payment_status',
      header: 'Pago',
      type: 'text',
      accessorKey: 'payment_status',
      cell: ({ row }) => {
        const status = row.original.payment_status;
        
        // Direct mapping without any conditional logic
        if (status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (status === 'partial') return <Badge variant="info">Parcial</Badge>;
        if (status === 'paid') return <Badge variant="success">Pagada</Badge>;
        if (status === 'refunded') return <Badge variant="secondary">Reembolsada</Badge>;
        
        // Default fallback
        return <span>—</span>;
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div className="flex space-x-2 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={() => handlePreviewInvoice(sale)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Ver Factura
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={() => {
                // Navigate to the appropriate route based on user role
                const basePath = user?.role === 'admin' ? '/admin' : '/receptionist';
                navigate(`${basePath}/sales/${sale.id}`);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Ventas</h1>
        <div className="flex gap-2">
          <Select
            value={perPage.toString()}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setCurrentPage(1); // Reset to first page when changing items per page
              setTimeout(fetchSales, 0); // Refetch with new per_page
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Items por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button onClick={goToNewSale}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Cobrado: {formatCurrency(todayStats.collected_amount || 0)}
                    </p>
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
                        : "0.0% del total"
                      }
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

      {/* Sales Table */}
      <Card className="border-none shadow-md">
        <CardHeader className="bg-white rounded-t-xl px-6 py-5 border-b">
          <CardTitle className="text-xl font-semibold text-gray-800">Listado de Ventas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sales}
            columns={columns}
            loading={loading}
            emptyMessage="No se encontraron ventas con los filtros aplicados"
            enablePagination={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="shadow-sm rounded-lg"
          />
        </CardContent>
      </Card>

      {/* Payment Modal */}
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
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Seleccionar método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(paymentMethods) && paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Monto *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={currentSale?.balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            {paymentMethod && Array.isArray(paymentMethods) && paymentMethods.find(pm => pm.id.toString() === paymentMethod)?.requires_reference && (
              <div className="grid gap-2">
                <Label htmlFor="payment-reference">Número de Referencia *</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="payment-date">Fecha de Pago *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-notes">Notas</Label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitPayment}>
              Agregar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar Ventas</DialogTitle>
            <DialogDescription>
              Aplique filtros para encontrar ventas específicas
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filter-status">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
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
              <Select
                value={filters.payment_status}
                onValueChange={(value) => setFilters({ ...filters, payment_status: value })}
              >
                <SelectTrigger id="filter-payment-status">
                  <SelectValue placeholder="Todos los estados de pago" />
                </SelectTrigger>
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
              <Input
                id="filter-date-from"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="filter-date-to">Fecha Hasta</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="filter-patient-id">ID del Paciente</Label>
              <Input
                id="filter-patient-id"
                placeholder="ID del paciente"
                value={filters.patient_id || ''}
                onChange={(e) => updatePatientIdFilter(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
            <Button onClick={applyFilters}>
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Factura</DialogTitle>
            <DialogDescription>
              Previsualización del documento de factura
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(80vh-10rem)]">
            {pdfPreviewUrl && <PDFViewer url={pdfPreviewUrl} height="100%" />}
          </div>
          <DialogFooter>
            <Button onClick={() => setPdfPreviewOpen(false)}>
              Cerrar
            </Button>
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
  );
};

export default Sales; 