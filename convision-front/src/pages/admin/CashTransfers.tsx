import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowUpDown,
  Plus,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react';
import { cashTransferService } from '@/services/cashTransferService';
import PageLayout from '@/components/layouts/PageLayout';

const CashTransfers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats } = useQuery({
    queryKey: ['cash-transfer-stats'],
    queryFn: () => cashTransferService.getStats(),
  });

  const deleteCashTransferMutation = useMutation({
    mutationFn: cashTransferService.deleteCashTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transfer-stats'] });
      toast({
        title: 'Éxito',
        description: 'Traslado eliminado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el traslado',
        variant: 'destructive',
      });
    },
  });

  const approveCashTransferMutation = useMutation({
    mutationFn: cashTransferService.approveCashTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transfer-stats'] });
      toast({
        title: 'Éxito',
        description: 'Traslado aprobado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el traslado',
        variant: 'destructive',
      });
    },
  });

  const cancelCashTransferMutation = useMutation({
    mutationFn: cashTransferService.cancelCashTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-transfer-stats'] });
      toast({
        title: 'Éxito',
        description: 'Traslado cancelado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar el traslado',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'default' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  type CashTransferRow = {
    id: number;
    transfer_number: string;
    origin_type: string;
    origin_description: string;
    destination_type: string;
    destination_description: string;
    amount: number;
    reason: string;
    requested_by?: string;
    status: 'pending' | 'approved' | 'completed' | 'cancelled' | string;
    created_at: string;
  };

  const columns: DataTableColumnDef<CashTransferRow>[] = [
    {
      id: 'transfer_number',
      accessorKey: 'transfer_number',
      header: 'Número',
      type: 'text',
      cell: (row) => (
        <div className="font-medium">{row.transfer_number}</div>
      ),
    },
    {
      id: 'origin',
      accessorKey: 'origin',
      header: 'Origen',
      type: 'text',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.origin_type}</div>
          <div className="text-sm text-muted-foreground">{row.origin_description}</div>
        </div>
      ),
    },
    {
      id: 'destination',
      accessorKey: 'destination',
      header: 'Destino',
      type: 'text',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.destination_type}</div>
          <div className="text-sm text-muted-foreground">{row.destination_description}</div>
        </div>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Monto',
      type: 'money',
      cell: (row) => (
        <div className="font-medium text-green-600">
          {formatCurrency(row.amount)}
        </div>
      ),
    },
    {
      id: 'reason',
      accessorKey: 'reason',
      header: 'Razón',
      type: 'text',
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.reason}>
          {row.reason}
        </div>
      ),
    },
    {
      id: 'requested_by',
      accessorKey: 'requested_by',
      header: 'Solicitado por',
      type: 'text',
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Estado',
      type: 'text',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: 'Fecha',
      type: 'date',
      cell: (row) => formatDate(row.created_at),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/cash-transfers/${row.id}`)}
          >
            Ver
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveCashTransferMutation.mutate(row.id)}
              >
                Aprobar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelCashTransferMutation.mutate(row.id)}
              >
                Cancelar
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteCashTransferMutation.mutate(row.id)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const statsCards = [
    {
      title: 'Total Traslados',
      value: stats?.total_transfers || 0,
      subtitle: 'Este mes',
      icon: ArrowUpDown,
      color: 'text-blue-600',
    },
    {
      title: 'Monto Total',
      value: formatCurrency(stats?.total_amount || 0),
      subtitle: 'Trasladado',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Pendientes',
      value: stats?.pending_transfers || 0,
      subtitle: 'Por aprobar',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Completados',
      value: stats?.completed_transfers || 0,
      subtitle: 'Finalizados',
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ];

  return (
    <PageLayout
      title="Traslados de Efectivo"
      subtitle="Gestiona los movimientos internos de fondos"
      actions={
        <Button onClick={() => navigate('/admin/cash-transfers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Traslado
        </Button>
      }
    >
      <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EntityTable<CashTransferRow>
        columns={columns}
        queryKeyBase="cash-transfers"
        fetcher={({ page, per_page, search }) =>
          cashTransferService.getCashTransfers({
            page,
            per_page,
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          })
        }
        extraFilters={{ status: statusFilter }}
        searchPlaceholder="Buscar por número, razón..."
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Traslados de Efectivo</span>
            <span className="text-[11px] text-[#7d7d87]">Movimientos internos de fondos</span>
          </div>
        }
        toolbarTrailing={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[34px] px-3 border border-[#e5e5e9] bg-white rounded-[6px] text-[12px]"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        }
        emptyStateNode={<EmptyState variant="default" title="Sin traslados" description="No hay traslados de efectivo registrados." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />
      </div>
    </PageLayout>
  );
};

export default CashTransfers; 