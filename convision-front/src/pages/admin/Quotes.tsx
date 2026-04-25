import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Filter,
  Download,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { quoteService, Quote } from '@/services/quoteService';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import PageLayout from '@/components/layouts/PageLayout';

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    patient_id: undefined as number | undefined,
  });

  const handleDownloadQuote = async (quote: Quote) => {
    try {
      if (!quote.pdf_token) {
        toast({ title: 'Error', description: 'No se pudo generar el token para la descarga.', variant: 'destructive' });
        return;
      }
      await quoteService.downloadQuotePdfWithToken(quote.id, quote.quote_number, quote.pdf_token);
    } catch {
      toast({ title: 'Error', description: 'Error al descargar la cotización.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (quote: Quote, status: 'pending' | 'approved' | 'rejected' | 'expired') => {
    try {
      await quoteService.updateQuoteStatus(quote.id, status);
      toast({ title: 'Estado actualizado', description: 'El estado de la cotización ha sido actualizado exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado de la cotización.', variant: 'destructive' });
    }
  };

  const handleConvertToSale = async (quote: Quote) => {
    try {
      const response = await quoteService.convertToSale(quote.id);
      toast({ title: 'Cotización convertida', description: 'La cotización ha sido convertida a venta exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (response.sale && response.sale.id) {
        navigate(`/admin/sales/${response.sale.id}`);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo convertir la cotización a venta.', variant: 'destructive' });
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', date_from: '', date_to: '', patient_id: undefined });
  };

  const columns: DataTableColumnDef<Quote>[] = [
    {
      id: 'quote_number',
      header: 'Número',
      type: 'text',
      accessorKey: 'quote_number',
      cell: (quote) => quote.quote_number
        ? <span className="font-medium text-blue-600">{quote.quote_number}</span>
        : '—'
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row: Quote) => `${row.patient?.first_name || ''} ${row.patient?.last_name || ''}`.trim(),
      cell: (quote) => !quote.patient ? '—' : (
        <div className="flex flex-col">
          <span className="font-medium">{quote.patient.first_name} {quote.patient.last_name}</span>
          {quote.patient.identification && (
            <span className="text-xs text-gray-500">ID: {quote.patient.identification}</span>
          )}
        </div>
      )
    },
    { id: 'created_at', header: 'Fecha', type: 'date', accessorKey: 'created_at', className: 'whitespace-nowrap' },
    {
      id: 'expiration_date',
      header: 'Vence',
      type: 'date',
      accessorKey: 'expiration_date',
      className: 'whitespace-nowrap',
      cell: (quote) => {
        const expirationDate = new Date(quote.expiration_date);
        const isExpired = expirationDate < new Date();
        return (
          <span className={isExpired ? "text-red-600 font-medium" : "font-medium"}>
            {format(expirationDate, 'dd/MM/yyyy')}
          </span>
        );
      }
    },
    { id: 'total', header: 'Total', type: 'money', accessorKey: 'total', className: 'text-right font-medium' },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (quote) => {
        if (quote.status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (quote.status === 'approved') return <Badge variant="success">Aprobada</Badge>;
        if (quote.status === 'rejected') return <Badge variant="destructive">Rechazada</Badge>;
        if (quote.status === 'expired') return <Badge variant="secondary">Expirada</Badge>;
        if (quote.status === 'converted') return <Badge variant="info">Convertida</Badge>;
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
          show: (quote: Quote) =>
            (quote.status === 'pending' || quote.status === 'approved') &&
            new Date(quote.expiration_date) >= new Date()
        },
        {
          label: 'Ver Detalles',
          icon: <CreditCard className="h-4 w-4 mr-2" />,
          onClick: (quote: Quote) => navigate(`/admin/quotes/${quote.id}`)
        }
      ]
    }
  ];

  return (
    <PageLayout title="Gestión de Cotizaciones">
      <EntityTable<Quote>
        columns={columns}
        fetcher={async (params) => {
          const result = await quoteService.getQuotes({
            page: params.page,
            per_page: params.per_page,
            search: params.search || undefined,
            status: filters.status || undefined,
            date_from: filters.date_from || undefined,
            date_to: filters.date_to || undefined,
            patient_id: filters.patient_id,
          });
          return { data: result.data, last_page: result.last_page, total: result.total };
        }}
        queryKeyBase="quotes"
        extraFilters={{ status: filters.status, date_from: filters.date_from, date_to: filters.date_to, patient_id: filters.patient_id }}
        searchPlaceholder="Buscar cotización..."
        onRowClick={(quote) => navigate(`/admin/quotes/${quote.id}`)}
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Cotizaciones</span>
            <span className="text-[11px] text-[#7d7d87]">Listado de cotizaciones</span>
          </div>
        }
        toolbarTrailing={
          <>
            <Button variant="outline" size="sm" onClick={() => setFilterModalOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button size="sm" onClick={() => navigate('/admin/quotes/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </>
        }
      />

      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar Cotizaciones</DialogTitle>
            <DialogDescription>Aplique filtros para encontrar cotizaciones específicas</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filter-status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
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
              <Label htmlFor="filter-date-from">Fecha Desde</Label>
              <Input id="filter-date-from" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-date-to">Fecha Hasta</Label>
              <Input id="filter-date-to" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-patient-id">ID del Cliente</Label>
              <Input
                id="filter-patient-id"
                placeholder="ID del cliente"
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
    </PageLayout>
  );
};

export default Quotes;
