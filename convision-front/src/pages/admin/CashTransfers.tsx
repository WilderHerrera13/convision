import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowUpDown,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { cashTransferService } from '@/services/cashTransferService';

const CashTransfers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: cashTransfers, isLoading } = useQuery({
    queryKey: ['cash-transfers', searchTerm, statusFilter],
    queryFn: () => cashTransferService.getCashTransfers({
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

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

  const columns = [
    {
      accessorKey: 'transfer_number',
      header: 'Número',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="font-medium">{row.original.transfer_number}</div>
      ),
    },
    {
      accessorKey: 'origin',
      header: 'Origen',
      cell: ({ row }: { row: { original: any } }) => (
        <div>
          <div className="font-medium">{row.original.origin_type}</div>
          <div className="text-sm text-muted-foreground">{row.original.origin_description}</div>
        </div>
      ),
    },
    {
      accessorKey: 'destination',
      header: 'Destino',
      cell: ({ row }: { row: { original: any } }) => (
        <div>
          <div className="font-medium">{row.original.destination_type}</div>
          <div className="text-sm text-muted-foreground">{row.original.destination_description}</div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="font-medium text-green-600">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Razón',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="max-w-xs truncate" title={row.original.reason}>
          {row.original.reason}
        </div>
      ),
    },
    {
      accessorKey: 'requested_by',
      header: 'Solicitado por',
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }: { row: { original: any } }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: ({ row }: { row: { original: any } }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/cash-transfers/${row.original.id}`)}
          >
            Ver
          </Button>
          {row.original.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveCashTransferMutation.mutate(row.original.id)}
              >
                Aprobar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelCashTransferMutation.mutate(row.original.id)}
              >
                Cancelar
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteCashTransferMutation.mutate(row.original.id)}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traslados de Efectivo</h1>
          <p className="text-muted-foreground">
            Gestiona los movimientos internos de fondos
          </p>
        </div>
        <Button onClick={() => navigate('/admin/cash-transfers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Traslado
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Traslados de Efectivo</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número, razón..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={cashTransfers?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CashTransfers; 