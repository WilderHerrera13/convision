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
import { Plus, Filter, Download, CreditCard, DollarSign } from 'lucide-react';
import { quoteService, Quote, QuoteFilterParams } from '@/services/quoteService';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import PageLayout from '@/components/layouts/PageLayout';

const ReceptionistQuotes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<Omit<QuoteFilterParams, 'page' | 'per_page' | 'search'>>({
    status: '',
    date_from: '',
    date_to: '',
    patient_id: undefined,
  });

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

  const handleConvertToSale = async (quote: Quote) => {
    try {
      const response = await quoteService.convertToSale(quote.id);
      toast({ title: 'Cotización convertida', description: 'La cotización ha sido convertida a venta exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      if (response.sale?.id) navigate('/receptionist/sales');
    } catch {
      toast({ title: 'Error', description: 'No se pudo convertir la cotización a venta.', variant: 'destructive' });
    }
  };

  const columns: DataTableColumnDef<Quote>[] = [
    {
      id: 'quote_number',
      header: 'Número',
      type: 'text',
      accessorKey: 'quote_number'
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row: Quote) => `${row.patient?.first_name || ''} ${row.patient?.last_name || ''}`.trim()
    },
    {
      id: 'created_at',
      header: 'Fecha',
      type: 'date',
      accessorKey: 'created_at'
    },
    {
      id: 'expiration_date',
      header: 'Vence',
      type: 'date',
      accessorKey: 'expiration_date'
    },
    {
      id: 'total',
      header: 'Total',
      type: 'money',
      accessorKey: 'total'
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (quote) => {
        if (quote.status === 'pending') return <Badge variant="warning">Pendiente</Badge>;
        if (quote.status === 'approved') return <Badge variant="success">Aprobada</Badge>;
        if (quote.status === 'rejected') return <Badge variant="destructive">Rechazada</Badge>;
        if (quote.status === 'expired') return <Badge variant="secondary">Expirada</Badge>;
        if (quote.status === 'converted') return <Badge variant="info">Convertida</Badge>;
        return <span>—</span>;
      },
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
          show: (quote: Quote) => !!quote.pdf_token,
        },
        {
          label: 'Convertir a Venta',
          icon: <DollarSign className="h-4 w-4 mr-2 text-blue-500" />,
          onClick: (quote: Quote) => handleConvertToSale(quote),
          show: (quote: Quote) =>
            (quote.status === 'pending' || quote.status === 'approved') &&
            new Date(quote.expiration_date) >= new Date(),
        },
        {
          label: 'Ver Detalles',
          icon: <CreditCard className="h-4 w-4 mr-2" />,
          onClick: (quote: Quote) => navigate(`/receptionist/quotes/${quote.id}`),
        },
      ],
    },
  ];

  return (
    <PageLayout
      title="Cotizaciones"
      subtitle="Gestión de cotizaciones"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilterModalOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button onClick={() => navigate('/receptionist/quotes/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      }
    >
      <EntityTable<Quote>
        columns={columns}
        queryKeyBase="quotes"
        fetcher={({ page, per_page, search }) =>
          quoteService.getQuotes({
            page,
            per_page,
            search: search || undefined,
            status: filters.status || undefined,
            date_from: filters.date_from || undefined,
            date_to: filters.date_to || undefined,
            patient_id: filters.patient_id,
          })
        }
        searchPlaceholder="Buscar por número o cliente..."
        extraFilters={{ status: filters.status, date_from: filters.date_from, date_to: filters.date_to, patient_id: filters.patient_id }}
        onRowClick={(quote) => navigate(`/receptionist/quotes/${quote.id}`)}
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Cotizaciones</span>
            <span className="text-[11px] text-[#7d7d87]">Listado de cotizaciones</span>
          </div>
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
                onChange={(e) =>
                  setFilters({ ...filters, patient_id: e.target.value ? parseInt(e.target.value) : undefined })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFilters({ status: '', date_from: '', date_to: '', patient_id: undefined })}
            >
              Limpiar Filtros
            </Button>
            <Button onClick={() => setFilterModalOpen(false)}>Aplicar Filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ReceptionistQuotes;
