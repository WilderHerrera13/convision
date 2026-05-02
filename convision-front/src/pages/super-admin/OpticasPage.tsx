import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { superAdminService } from '@/services/superAdmin';
import type { Optica } from '@/types/optica';
import type { DataTableColumnDef } from '@/components/ui/data-table/DataTable';

const PLAN_LABELS: Record<string, string> = {
  standard: 'Estándar',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const columns: DataTableColumnDef<Optica>[] = [
  { id: 'name', header: 'Óptica', type: 'custom', enableSorting: true, cell: (o: Optica) => (
    <span className="font-semibold text-[#121215]">{o.name}</span>
  )},
  { id: 'slug', header: 'Schema', type: 'custom', enableSorting: true, cell: (o: Optica) => (
    <code className="text-[12px] bg-[#f5f5f7] px-1.5 py-0.5 rounded text-[#3a71f7]">{o.schema_name}</code>
  )},
  { id: 'plan', header: 'Plan', type: 'custom', cell: (o: Optica) => (
    <Badge variant="outline">{PLAN_LABELS[o.plan] ?? o.plan}</Badge>
  )},
  { id: 'is_active', header: 'Estado', type: 'custom', cell: (o: Optica) => (
    <Badge variant={o.is_active ? 'default' : 'secondary'}>{o.is_active ? 'Activa' : 'Inactiva'}</Badge>
  )},
  { id: 'created_at', header: 'Creada', type: 'custom', cell: (o: Optica) => (
    <span className="text-[#7d7d87]">{new Date(o.created_at).toLocaleDateString('es-CO')}</span>
  )},
];

const OpticasPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#ebebee] bg-white px-6 h-[60px] flex items-center shrink-0">
        <div>
          <p className="text-[12px] text-[#7d7d87] leading-none mb-1">Panel Super Admin / Ópticas</p>
          <h1 className="text-[16px] font-semibold text-[#0f0f12] leading-none">Ópticas</h1>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <EntityTable<Optica>
          columns={columns}
          queryKeyBase="super-admin-opticas"
          fetcher={superAdminService.getForTable}
          searchPlaceholder="Buscar óptica..."
          paginationVariant="figma"
          ledgerBorderMode="figma"
          tableLayout="ledger"
          showPageSizeSelect={false}
          initialPerPage={15}
          tableAriaLabel="Ópticas del sistema"
          onRowClick={(optica) => navigate(`/super-admin/opticas/${optica.id}`)}
          emptyStateNode={
            <EmptyState
              leadingIcon={Building2}
              accentColor="#3a71f7"
              title="Sin ópticas"
              description="No hay ópticas registradas en el sistema."
            />
          }
          filterEmptyStateNode={<EmptyState variant="table-filter" />}
          toolbarLeading={
            <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
              <span className="text-[14px] font-semibold text-[#121215]">Ópticas registradas</span>
              <span className="text-[11px] text-[#7d7d87]">Gestiona las ópticas del sistema</span>
            </div>
          }
          toolbarTrailing={
            <Button
              type="button"
              className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#3a71f7] px-3 text-[12px] font-semibold text-white hover:bg-[#2558d4]"
              onClick={() => navigate('/super-admin/opticas/nueva')}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva Óptica
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default OpticasPage;
