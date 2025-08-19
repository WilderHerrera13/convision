import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Download, 
  CreditCard, 
  DollarSign, 
  CheckCircle,
  XCircle
} from 'lucide-react';
import { quoteService, Quote, QuoteFilterParams } from '@/services/quoteService';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumnDef } from '@/components/ui/data-table';
import { formatCurrency, formatDate } from '@/lib/utils';

// Badge variants for statuses
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'approved': return 'bg-green-500 hover:bg-green-600';
    case 'rejected': return 'bg-red-500 hover:bg-red-600';
    case 'expired': return 'bg-gray-500 hover:bg-gray-600';
    case 'converted': return 'bg-blue-500 hover:bg-blue-600';
    default: return 'bg-blue-500 hover:bg-blue-600';
  }
};

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<QuoteFilterParams>({
    status: '',
    date_from: '',
    date_to: '',
    patient_id: undefined,
    search: '',
  });
  const [perPage, setPerPage] = useState(10);
  
  // Load quotes on component mount and filter changes
  useEffect(() => {
    fetchQuotes();
  }, [currentPage, filters]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      // Create params with current page and per_page
      const params: QuoteFilterParams = {
        page: currentPage,
        per_page: perPage,
        ...filters
      };
      
      // Only add filter values that aren't empty strings
      if (filters.status) params.status = filters.status;
      if (filters.date_from && filters.date_from !== '') params.date_from = filters.date_from;
      if (filters.date_to && filters.date_to !== '') params.date_to = filters.date_to;
      if (filters.patient_id) params.patient_id = filters.patient_id;
      if (filters.search) params.search = filters.search;

      const response = await quoteService.getQuotes(params);
      const receivedQuotes = response.data;
      
      // Debug: Log the quotes data to check status field
      console.log('Received quotes:', receivedQuotes);
      if (receivedQuotes.length > 0) {
        console.log('First quote status:', receivedQuotes[0].status);
      }
      
      setQuotes(receivedQuotes);
      setTotalPages(response.last_page);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cotizaciones.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQuote = async (quote: Quote) => {
    try {
      if (!quote.pdf_token) {
        toast({
          title: 'Error',
          description: 'No se pudo generar el token para la descarga.',
          variant: 'destructive'
        });
        return;
      }
      
      await quoteService.downloadQuotePdfWithToken(quote.id, quote.quote_number, quote.pdf_token);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al descargar la cotización.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateStatus = async (quote: Quote, status: 'pending' | 'approved' | 'rejected' | 'expired') => {
    try {
      await quoteService.updateQuoteStatus(quote.id, status);
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la cotización ha sido actualizado exitosamente.'
      });
      fetchQuotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la cotización.',
        variant: 'destructive'
      });
    }
  };

  const handleConvertToSale = async (quote: Quote) => {
    try {
      const response = await quoteService.convertToSale(quote.id);
      toast({
        title: 'Cotización convertida',
        description: 'La cotización ha sido convertida a venta exitosamente.',
      });
      fetchQuotes();
      // Navigate to the new sale
      if (response.sale && response.sale.id) {
        navigate(`/admin/sales/${response.sale.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo convertir la cotización a venta.',
        variant: 'destructive'
      });
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchQuotes();
    setFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      date_from: '',
      date_to: '',
      patient_id: undefined,
      search: '',
    });
    setCurrentPage(1);
  };

  const goToNewQuote = () => {
    navigate('/admin/quotes/new');
  };

  const updatePatientIdFilter = (value: string) => {
    setFilters({
      ...filters,
      patient_id: value ? parseInt(value) : undefined
    });
  };

  // Define columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'quote_number',
      header: 'Número',
      type: 'text',
      accessorKey: 'quote_number',
      cell: ({ row }) => {
        const quote = row.original;
        return quote.quote_number ? (
          <span className="font-medium text-blue-600">{quote.quote_number}</span>
        ) : (
          '—'
        );
      }
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row: Quote) => `${row.patient?.first_name || ''} ${row.patient?.last_name || ''}`.trim(),
      cell: ({ row }) => {
        const quote = row.original;
        if (!quote.patient) return '—';
        return (
          <div className="flex flex-col">
            <span className="font-medium">{quote.patient.first_name} {quote.patient.last_name}</span>
            {quote.patient.identification && (
              <span className="text-xs text-gray-500">ID: {quote.patient.identification}</span>
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
      id: 'expiration_date',
      header: 'Vence',
      type: 'date',
      accessorKey: 'expiration_date',
      className: 'whitespace-nowrap',
      cell: ({ row }) => {
        const quote = row.original;
        const today = new Date();
        const expirationDate = new Date(quote.expiration_date);
        const isExpired = expirationDate < today;
        
        return (
          <span className={isExpired ? "text-red-600 font-medium" : "font-medium"}>
            {format(expirationDate, 'dd/MM/yyyy')}
          </span>
        );
      }
    },
    {
      id: 'total',
      header: 'Total',
      type: 'money',
      accessorKey: 'total',
      className: 'text-right font-medium'
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
        if (status === 'approved') return <Badge variant="success">Aprobada</Badge>;
        if (status === 'rejected') return <Badge variant="destructive">Rechazada</Badge>;
        if (status === 'expired') return <Badge variant="secondary">Expirada</Badge>;
        if (status === 'converted') return <Badge variant="info">Convertida</Badge>;
        
        // Default fallback
        return <span>—</span>;
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Descargar PDF',
          icon: <Download className="h-4 w-4 mr-2" />,
          onClick: (quote: Quote) => handleDownloadQuote(quote),
          show: (quote: Quote) => !!quote.pdf_token
        },
        {
          label: 'Aprobar',
          icon: <CheckCircle className="h-4 w-4 mr-2 text-green-500" />,
          onClick: (quote: Quote) => handleUpdateStatus(quote, 'approved'),
          show: (quote: Quote) => quote.status === 'pending'
        },
        {
          label: 'Rechazar',
          icon: <XCircle className="h-4 w-4 mr-2 text-red-500" />,
          onClick: (quote: Quote) => handleUpdateStatus(quote, 'rejected'),
          show: (quote: Quote) => quote.status === 'pending'
        },
        {
          label: 'Convertir a Venta',
          icon: <DollarSign className="h-4 w-4 mr-2 text-blue-500" />,
          onClick: (quote: Quote) => handleConvertToSale(quote),
          show: (quote: Quote) => (
            (quote.status === 'pending' || quote.status === 'approved') && 
            new Date(quote.expiration_date) >= new Date()
          )
        },
        {
          label: 'Ver Detalles',
          icon: <CreditCard className="h-4 w-4 mr-2" />,
          onClick: (quote: Quote) => navigate(`/admin/quotes/${quote.id}`)
        }
      ]
    }
  ];

  const handleRowClick = (quote: Quote) => {
    navigate(`/admin/quotes/${quote.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Cotizaciones</h1>
        <div className="flex items-center gap-2">
          <Select
            value={perPage.toString()}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setCurrentPage(1); // Reset to first page when changing items per page
              setTimeout(fetchQuotes, 0); // Refetch with new per_page
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
          <Button onClick={goToNewQuote}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Quotes DataTable */}
      <Card className="shadow-md border-none">
        <CardContent className="p-0">
          <DataTable
            data={quotes}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            emptyMessage="No se encontraron cotizaciones con los filtros aplicados"
            enablePagination={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            title="Listado de Cotizaciones"
          />
        </CardContent>
      </Card>

      {/* Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar Cotizaciones</DialogTitle>
            <DialogDescription>
              Aplique filtros para encontrar cotizaciones específicas
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
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                  <SelectItem value="converted">Convertida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="filter-search">Buscar</Label>
              <Input
                id="filter-search"
                placeholder="Número o cliente"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
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
              <Label htmlFor="filter-patient-id">ID del Cliente</Label>
              <Input
                id="filter-patient-id"
                placeholder="ID del cliente"
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
    </div>
  );
};

export default Quotes; 