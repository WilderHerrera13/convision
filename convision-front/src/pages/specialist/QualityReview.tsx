import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Info, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { DataTableColumnDef } from '@/components/ui/data-table/DataTable';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { LABORATORY_ORDER_STATUS_LABELS, LAB_ORDER_STATUS_TOKENS } from '@/constants/laboratoryOrderStatus';

const QUALITY_STATUS_LABEL: Record<string, string> = {
  ...LABORATORY_ORDER_STATUS_LABELS,
  in_quality: 'En revisión',
};

const QUALITY_STATUS_CLASS: Record<string, string> = {
  in_quality: 'bg-[#fff6e3] text-[#b57218]',
};

function QualityBadge({ status }: { status: string }) {
  const fixedCls = QUALITY_STATUS_CLASS[status];
  const token = !fixedCls ? LAB_ORDER_STATUS_TOKENS[status as keyof typeof LAB_ORDER_STATUS_TOKENS] : null;
  const style = token ? { backgroundColor: token.bg, color: token.text } : undefined;
  const cls = fixedCls ?? 'bg-gray-100 text-gray-600';
  return (
    <Badge className={`${fixedCls ? cls : ''} border-0`} style={style}>
      {QUALITY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function EmptyNode() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Inbox className="size-10 text-[#b4b5bc]" strokeWidth={1.5} />
      <p className="text-[15px] font-semibold text-[#121215]">Sin órdenes pendientes</p>
      <p className="text-[12px] text-[#7d7d87] max-w-sm">
        Cuando el laboratorio entregue una orden lista, aparecerá aquí para que valides la calidad antes de entregarla al paciente.
      </p>
    </div>
  );
}

const COLUMNS: DataTableColumnDef<LaboratoryOrder>[] = [
  {
    id: 'order_number',
    header: '#',
    type: 'text',
    accessorKey: 'order_number',
    cell: (row) => (
      <span className="text-[13px] font-semibold text-[#121215]">{row.order_number}</span>
    ),
  },
  {
    id: 'patient',
    header: 'Paciente',
    type: 'text',
    cell: (row) => (
      <span className="text-[13px] font-semibold text-[#121215]">
        {row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : '—'}
      </span>
    ),
  },
  {
    id: 'laboratory',
    header: 'Lab. asignado',
    type: 'text',
    cell: (row) => (
      <span className="text-[13px] text-[#7d7d87]">{row.laboratory?.name ?? '—'}</span>
    ),
  },
  {
    id: 'notes',
    header: 'Producto',
    type: 'text',
    cell: (row) => (
      <span className="text-[13px] text-[#121215] truncate max-w-[280px] block">
        {row.notes ?? '—'}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Calidad',
    type: 'status',
    accessorKey: 'status',
    cell: (row) => <QualityBadge status={row.status} />,
  },
  {
    id: 'actions',
    header: 'Acciones',
    type: 'actions',
    cell: () => null,
  },
];

const QualityReview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const actionHandledRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (actionHandledRef.current) return;
    const action = searchParams.get('action');
    if (action === 'approved') {
      actionHandledRef.current = true;
      toast({ title: 'Orden aprobada y lista para entrega', duration: 5000 });
      setSearchParams({}, { replace: true });
      setRefreshKey((k) => k + 1);
    } else if (action === 'returned') {
      actionHandledRef.current = true;
      toast({ title: 'Orden retornada al laboratorio', duration: 5000 });
      setSearchParams({}, { replace: true });
      setRefreshKey((k) => k + 1);
    }
  }, [searchParams, setSearchParams, toast]);

  const columnsWithActions: DataTableColumnDef<LaboratoryOrder>[] = COLUMNS.map((col) => {
    if (col.id !== 'actions') return col;
    return {
      ...col,
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            title="Ver detalle"
            onClick={(e) => { e.stopPropagation(); navigate(`/specialist/laboratory-orders/${row.id}`); }}
            className="flex items-center justify-center size-8 rounded-md border border-[#e5e5e9] bg-white text-[#7d7d87] hover:text-[#0f8f64] hover:border-[#0f8f64] transition-colors"
          >
            <Eye className="size-4" />
          </button>
        </div>
      ),
    };
  });

  return (
    <PageLayout title="Revisión de Calidad">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 bg-[#ebf5ef] border border-[#a3d9b8] rounded-[8px] px-4 py-3">
          <Info className="size-4 text-[#228b52] shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#121215]">
            Como especialista, revisa la calidad de cada lente antes de autorizar su entrega al cliente. Si hay defectos, retorna al laboratorio con una nota.
          </p>
        </div>

        <EntityTable<LaboratoryOrder>
          key={refreshKey}
          queryKeyBase="quality-review-orders"
          columns={columnsWithActions}
          fetcher={async ({ page, per_page, search }) => {
            const resp = await laboratoryOrderService.getLaboratoryOrders({
              status: 'in_quality',
              search: search || undefined,
              page,
              per_page,
              sort_field: 'created_at',
              sort_direction: 'desc',
            });
            return resp;
          }}
          searchPlaceholder="Buscar por # o paciente..."
          onRowClick={(row) => navigate(`/specialist/laboratory-orders/${row.id}`)}
          emptyStateNode={<EmptyNode />}
          paginationVariant="figma"
          tableLayout="ledger"
          ledgerBorderMode="figma"
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Pendientes de revisión</span>
            </div>
          }
          enableSorting={false}
        />

        <p className="text-[12px] text-[#7d7d87] text-center pb-2">
          Selecciona una orden para revisar el lente y emitir tu decisión de calidad.
        </p>
      </div>
    </PageLayout>
  );
};

export default QualityReview;
