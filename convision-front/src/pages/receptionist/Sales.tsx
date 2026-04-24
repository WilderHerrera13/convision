import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, FileText, Plus, Filter, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';
import { saleService, Sale, SaleFilterParams, SaleStats } from '@/services/saleService';
import { formatCurrency } from '@/lib/utils';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import PageLayout from '@/components/layouts/PageLayout';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  refunded: 'Reembolsada',
};

const SALE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

function SaleStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#ebf5ef] text-[#228b52] text-[11px] font-semibold whitespace-nowrap">
        Completada
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#ffeeed] text-[#b82626] text-[11px] font-semibold whitespace-nowrap">
        Cancelada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#fff6e3] text-[#b57218] text-[11px] font-semibold whitespace-nowrap">
      Pendiente
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#ebf5ef] text-[#228b52] text-[11px] font-semibold whitespace-nowrap">
        Pagada
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#eff4ff] text-[#3b5fc0] text-[11px] font-semibold whitespace-nowrap">
        Parcial
      </span>
    );
  }
  if (status === 'refunded') {
    return (
      <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#f5f5f7] text-[#7d7d87] text-[11px] font-semibold whitespace-nowrap">
        Reembolsada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-[10px] py-[3px] rounded-full bg-[#fff6e3] text-[#b57218] text-[11px] font-semibold whitespace-nowrap">
      Pendiente
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: React.ReactNode;
  subtext: string;
}) {
  return (
    <div className="relative bg-white border border-[#e5e5e9] rounded-[8px] h-[88px] overflow-hidden flex-1 min-w-0">
      <div className="absolute left-[-2px] top-[-2px] w-[4px] h-[92px] bg-[#8753ef] rounded-[8px]" />
      <div className="pl-[18px] pr-4 pt-[16px]">
        <p className="text-[11px] text-[#7d7d87] font-normal leading-none mb-[4px]">{label}</p>
        <p className="text-[24px] font-semibold text-[#121212] leading-tight">{value}</p>
        <p className="text-[11px] text-[#b4b5bc] font-normal mt-[4px] truncate">{subtext}</p>
      </div>
    </div>
  );
}

const EMPTY_STATS: SaleStats = {
  total_sales: 0,
  total_revenue: 0,
  collected_amount: 0,
  pending_balance: 0,
  payment_status_breakdown: { paid: 0, partial: 0, pending: 0 },
  recent_sales: [],
  period: { start_date: '', end_date: '' },
};

const ReceptionistSales: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [filters, setFilters] = useState<SaleFilterParams>({
    status: '',
    payment_status: '',
    date_from: '',
    date_to: '',
  });

  const { data: todayStats } = useQuery<SaleStats>({
    queryKey: ['sales-today-stats'],
    queryFn: () => saleService.getTodayStats(),
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['receptionist-sales', currentPage, perPage, filters],
    queryFn: () => {
      const params: SaleFilterParams = { page: currentPage, per_page: perPage };
      if (filters.status) params.status = filters.status;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      return saleService.getSales(params);
    },
    placeholderData: (prev) => prev,
  });

  const sales: Sale[] = salesData?.data ?? [];
  const totalPages: number = salesData?.last_page ?? 1;

  const stats = todayStats ?? EMPTY_STATS;
  const pendingPercent =
    stats.total_revenue > 0
      ? ((stats.pending_balance / stats.total_revenue) * 100).toFixed(1)
      : '0.0';
  const paid = stats.payment_status_breakdown?.paid ?? 0;
  const partial = stats.payment_status_breakdown?.partial ?? 0;
  const pending = stats.payment_status_breakdown?.pending ?? 0;

  const handlePreviewInvoice = async (sale: Sale) => {
    try {
      setCurrentSale(sale);
      const { token } = await saleService.getPdfToken(sale.id);
      setPdfPreviewUrl(saleService.getSalePdfPreviewUrl(sale.id, token));
      setPdfPreviewOpen(true);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la vista previa.', variant: 'destructive' });
    }
  };

  const handleDownloadInvoice = async (sale: Sale) => {
    try {
      await saleService.downloadSalePdfSecure(sale.id, sale.sale_number);
    } catch {
      toast({ title: 'Error', description: 'No se pudo descargar la factura.', variant: 'destructive' });
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setFilterModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['receptionist-sales'] });
  };

  const clearFilters = () => {
    setFilters({ status: '', payment_status: '', date_from: '', date_to: '' });
    setCurrentPage(1);
  };

  const columns: DataTableColumnDef<Sale>[] = [
    {
      id: 'sale_number',
      header: 'N° Factura',
      type: 'text',
      accessorKey: 'sale_number',
      cell: (sale) => (
        <span className="text-[13px] text-[#7d7d87] font-normal">
          {sale.sale_number || '—'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Fecha',
      type: 'text',
      accessorKey: 'created_at',
      cell: (sale) => (
        <span className="text-[13px] text-[#121215] font-semibold whitespace-nowrap">
          {sale.created_at ? format(new Date(sale.created_at), 'dd/MM/yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      accessorFn: (row) =>
        row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : '—',
      cell: (sale) =>
        !sale.patient ? (
          <span className="text-[13px] text-[#7d7d87]">—</span>
        ) : (
          <div className="flex flex-col">
            <span className="text-[13px] text-[#7d7d87]">
              {sale.patient.first_name} {sale.patient.last_name}
            </span>
          </div>
        ),
    },
    {
      id: 'total',
      header: 'Total',
      type: 'text',
      accessorKey: 'total',
      cell: (sale) => (
        <span className="text-[13px] text-[#7d7d87]">{formatCurrency(sale.total)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (sale) => <SaleStatusBadge status={sale.status} />,
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (sale) => (
        <div className="flex items-center gap-[6px] justify-end">
          <button
            onClick={() => navigate(`/receptionist/sales/${sale.id}`)}
            className="bg-[#eff4ff] border border-[#c5d3f8] rounded-[6px] size-[32px] flex items-center justify-center hover:bg-[#dce8ff] transition-colors"
            title="Ver detalle"
          >
            <Eye className="size-[16px] text-[#3b5fc0]" />
          </button>
          <button
            onClick={() => handlePreviewInvoice(sale)}
            className="bg-[#f5f5f7] border border-[#e0e0e4] rounded-[6px] size-[32px] flex items-center justify-center hover:bg-[#ebebee] transition-colors"
            title="Ver factura"
          >
            <FileText className="size-[16px] text-[#7d7d87]" />
          </button>
        </div>
      ),
    },
  ];

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <PageLayout
      title="Ventas"
      subtitle="Ventas / Lista"
      titleStackClassName="flex-col-reverse gap-[2px]"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterModalOpen(true)}
            className="flex items-center gap-2 h-[36px] px-3 bg-white border border-[#e5e5e9] rounded-[6px] text-[13px] text-[#121215] hover:bg-[#f5f5f6] transition-colors"
          >
            <Filter className="size-[14px]" />
            Filtrar
          </button>
          <button
            onClick={() => navigate('/receptionist/sales/new')}
            className="flex items-center gap-2 h-[36px] px-5 bg-[#8753ef] rounded-[8px] text-[13px] text-white font-semibold hover:bg-[#7340d8] transition-colors whitespace-nowrap"
          >
            + Nueva venta
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-[16px]">
          <MetricCard
            label="Total Ventas Hoy"
            value={stats.total_sales ?? 0}
            subtext="transacciones registradas"
          />
          <MetricCard
            label="Ingresos Hoy"
            value={`$ ${formatCurrency(stats.total_revenue ?? 0)}`}
            subtext={`Cobrado: $ ${formatCurrency(stats.collected_amount ?? 0)}`}
          />
          <MetricCard
            label="Por Cobrar Hoy"
            value={`$ ${formatCurrency(stats.pending_balance ?? 0)}`}
            subtext={`${pendingPercent}% del total`}
          />
          <MetricCard
            label="Estado de Pagos"
            value={`${paid} pagadas`}
            subtext={`${partial} parciales · ${pending} pendientes`}
          />
        </div>

        <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
          <div className="flex items-center justify-between px-5 h-[52px] border-b border-[#e5e5e9]">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[14px] font-semibold text-[#121215]">Ventas</span>
              <span className="text-[11px] text-[#7d7d87] capitalize">{todayLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center h-[34px] px-3 bg-white border border-[#e5e5e9] rounded-[6px] w-[220px] gap-2">
                <Search className="size-[13px] text-[#b4b5bc] shrink-0" />
                <span className="text-[12px] text-[#b4b5bc]">Buscar venta...</span>
              </div>
            </div>
          </div>

          <DataTable
            data={sales}
            columns={columns}
            loading={isLoading}
            emptyMessage="No se encontraron ventas"
            enablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar Ventas</DialogTitle>
            <DialogDescription>Aplique filtros para encontrar ventas específicas</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Estado de venta</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger>
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
              <Label>Estado de pago</Label>
              <Select
                value={filters.payment_status}
                onValueChange={(v) => setFilters({ ...filters, payment_status: v })}
              >
                <SelectTrigger>
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
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button onClick={applyFilters}>Aplicar</Button>
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
                <Download className="size-4 mr-2" />
                Descargar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ReceptionistSales;
