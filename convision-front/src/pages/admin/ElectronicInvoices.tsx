import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import EntityTable from '@/components/ui/data-table/EntityTable';
import type { DataTableColumnDef } from '@/components/ui/data-table/DataTable';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageLayout from '@/components/layouts/PageLayout';
import { DatePicker } from '@/components/ui/date-picker';
import SearchableCombobox, { type ComboboxOption } from '@/components/ui/SearchableCombobox';
import electronicInvoicingService, {
  type ElectronicDocument,
  type DIANStatus,
  type DocumentType,
} from '@/services/electronicInvoicingService';
import { formatCurrency } from '@/lib/utils';

const DOC_TYPE_OPTIONS: ComboboxOption[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'FV', label: 'FV — Factura de Venta' },
  { value: 'NC', label: 'NC — Nota Crédito' },
  { value: 'ND', label: 'ND — Nota Débito' },
  { value: 'DS', label: 'DS — Documento Soporte' },
];

const DIAN_STATUS_OPTIONS: ComboboxOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'validated', label: 'Validado' },
  { value: 'contingency', label: 'Contingencia' },
  { value: 'sent', label: 'Enviado' },
  { value: 'signed', label: 'Firmado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'error', label: 'Error' },
];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  validated:   { label: 'Validado',     cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  sent:        { label: 'Enviado',      cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  signed:      { label: 'Firmado',      cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  contingency: { label: 'Contingencia', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  rejected:    { label: 'Rechazado',    cls: 'bg-red-100 text-red-800 border-red-200' },
  draft:       { label: 'Borrador',     cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  error:       { label: 'Error',        cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const DOC_CFG: Record<string, { cls: string }> = {
  FV:  { cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  NC:  { cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  ND:  { cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  DS:  { cls: 'bg-teal-100 text-teal-800 border-teal-200' },
  POS: { cls: 'bg-pink-100 text-pink-800 border-pink-200' },
};

export default function ElectronicInvoices() {
  const queryClient = useQueryClient();

  const [documentType, setDocumentType] = useState('');
  const [dianStatus, setDianStatus]     = useState('');
  const [startDate, setStartDate]       = useState<Date | undefined>();
  const [endDate, setEndDate]           = useState<Date | undefined>();
  const [externalRefInput, setExternalRefInput] = useState('');
  const [externalRef, setExternalRef]           = useState('');

  const extraFilters = useMemo<Record<string, unknown>>(
    () => ({
      document_type: documentType || undefined,
      dian_status:   dianStatus   || undefined,
      start_date:    startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      end_date:      endDate   ? format(endDate,   'yyyy-MM-dd') : undefined,
      external_ref:  externalRef  || undefined,
    }),
    [documentType, dianStatus, startDate, endDate, externalRef]
  );

  const clearFilters = useCallback(() => {
    setDocumentType('');
    setDianStatus('');
    setStartDate(undefined);
    setEndDate(undefined);
    setExternalRef('');
    setExternalRefInput('');
  }, []);

  const retryMutation = useMutation({
    mutationFn: (id: number) => electronicInvoicingService.retry(id),
    onSuccess: () => {
      toast.success('Reintento enviado a DIAN');
      queryClient.invalidateQueries({ queryKey: ['electronic-invoices'] });
    },
    onError: () => toast.error('Error al reintentar el envío'),
  });

  const handleDownloadXML = useCallback(async (doc: ElectronicDocument) => {
    try {
      const name = doc.number
        ? `${doc.document_type}_${doc.number}.xml`
        : `${doc.document_type}_${doc.id}.xml`;
      await electronicInvoicingService.downloadXML(doc.id, name);
      toast.success('Archivo XML descargado');
    } catch {
      toast.error('Error al descargar el XML');
    }
  }, []);

  const columns = useMemo<DataTableColumnDef<ElectronicDocument>[]>(
    () => [
      {
        id: 'document_type',
        accessorKey: 'document_type',
        header: 'Tipo',
        type: 'custom',
        cell: (row) => {
          const t = row.document_type as DocumentType;
          const cfg = DOC_CFG[t] ?? { cls: '' };
          return (
            <Badge variant="outline" className={`font-semibold text-xs ${cfg.cls}`}>
              {t}
            </Badge>
          );
        },
      },
      {
        id: 'number',
        accessorKey: 'number',
        header: 'Número',
        type: 'custom',
        cell: (row) => (
          <span className="font-mono text-sm">{row.number || '—'}</span>
        ),
      },
      {
        id: 'external_ref',
        accessorKey: 'external_ref',
        header: 'Ref. operación',
        type: 'custom',
        cell: (row) => (
          <span className="text-sm text-[#7d7d87]">{row.external_ref || '—'}</span>
        ),
      },
      {
        id: 'recipient_name',
        accessorKey: 'recipient_name',
        header: 'Destinatario',
        type: 'custom',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{row.recipient_name}</span>
            <span className="text-xs text-[#7d7d87]">{row.recipient_doc_number}</span>
          </div>
        ),
      },
      {
        id: 'total',
        accessorKey: 'total',
        header: 'Total',
        type: 'custom',
        cell: (row) => (
          <span className="font-semibold text-sm">{formatCurrency(row.total)}</span>
        ),
      },
      {
        id: 'issue_date',
        accessorKey: 'issue_date',
        header: 'Fecha',
        type: 'custom',
        cell: (row) => {
          try {
            return (
              <span className="text-sm">
                {format(new Date(row.issue_date), 'dd MMM yyyy', { locale: es })}
              </span>
            );
          } catch {
            return <span className="text-sm text-[#7d7d87]">—</span>;
          }
        },
      },
      {
        id: 'dian_status',
        accessorKey: 'dian_status',
        header: 'Estado DIAN',
        type: 'custom',
        cell: (row) => {
          const s = row.dian_status as DIANStatus;
          const cfg = STATUS_CFG[s] ?? { label: s, cls: '' };
          return (
            <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        type: 'actions',
        cell: (row) => {
          const canRetry = row.dian_status === 'contingency' || row.dian_status === 'error';
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Descargar XML"
                onClick={() => handleDownloadXML(row)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {canRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                  title="Reintentar envío DIAN"
                  disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate(row.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleDownloadXML, retryMutation]
  );

  return (
    <PageLayout title="Facturación Electrónica">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-52">
            <label className="text-xs text-[#7d7d87] mb-1 block">Tipo de documento</label>
            <SearchableCombobox
              options={DOC_TYPE_OPTIONS}
              value={documentType}
              onChange={setDocumentType}
              placeholder="Todos los tipos"
              searchPlaceholder="Buscar tipo..."
            />
          </div>
          <div className="w-44">
            <label className="text-xs text-[#7d7d87] mb-1 block">Estado DIAN</label>
            <SearchableCombobox
              options={DIAN_STATUS_OPTIONS}
              value={dianStatus}
              onChange={setDianStatus}
              placeholder="Todos los estados"
              searchPlaceholder="Buscar estado..."
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-[#7d7d87] mb-1 block">Desde</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Fecha inicio" />
          </div>
          <div className="w-40">
            <label className="text-xs text-[#7d7d87] mb-1 block">Hasta</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="Fecha fin" />
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-[#7d7d87] mb-1 block">Ref. venta / compra</label>
              <Input
                className="h-9 w-40 text-sm"
                placeholder="Ej: VTA-0001"
                value={externalRefInput}
                onChange={(e) => setExternalRefInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setExternalRef(externalRefInput)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setExternalRef(externalRefInput)}
            >
              Buscar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-[#7d7d87]"
              onClick={clearFilters}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <EntityTable<ElectronicDocument>
          queryKeyBase="electronic-invoices"
          columns={columns}
          fetcher={({ page, per_page, filters }) =>
            electronicInvoicingService.getForTable({ page, per_page, filters })
          }
          extraFilters={extraFilters}
          enableSearch={false}
          initialPerPage={20}
          emptyStateNode={
            <EmptyState
              leadingIcon={FileText}
              accentColor="#8753ef"
              title="Sin documentos electrónicos"
              description="Los documentos se generan automáticamente al crear ventas, cancelaciones o compras a proveedores."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
        />
      </div>
    </PageLayout>
  );
}
