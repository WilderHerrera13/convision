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
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Nombre', sortable: true },
  { key: 'slug', header: 'Slug', sortable: true },
  {
    key: 'plan',
    header: 'Plan',
    render: (o: Optica) => <Badge variant="outline">{PLAN_LABELS[o.plan] ?? o.plan}</Badge>,
  },
  {
    key: 'is_active',
    header: 'Estado',
    render: (o: Optica) => (
      <Badge variant={o.is_active ? 'default' : 'secondary'}>
        {o.is_active ? 'Activa' : 'Inactiva'}
      </Badge>
    ),
  },
];

const OpticasPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EntityTable<Optica>
      columns={columns}
      queryKeyBase="super-admin-opticas"
      fetcher={superAdminService.getForTable}
      searchPlaceholder="Buscar ópticas..."
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
          accentColor="#1a1a2e"
          title="Sin ópticas"
          description="No hay ópticas registradas en el sistema."
        />
      }
      filterEmptyStateNode={<EmptyState variant="table-filter" />}
      toolbarLeading={
        <div className="flex min-w-0 flex-col gap-0.5 leading-normal">
          <span className="text-[14px] font-semibold text-[#121215]">Ópticas</span>
          <span className="text-[11px] text-[#7d7d87]">Gestión de ópticas del sistema</span>
        </div>
      }
      toolbarTrailing={
        <Button
          type="button"
          className="h-[34px] min-w-[128px] shrink-0 rounded-[6px] bg-[#1a1a2e] px-3 text-[12px] font-semibold text-white hover:bg-[#2a2a4e]"
          onClick={() => navigate('/super-admin/opticas/nueva')}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva Óptica
        </Button>
      }
    />
  );
};

export default OpticasPage;
