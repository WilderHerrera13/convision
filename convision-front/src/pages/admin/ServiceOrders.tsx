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
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { serviceOrderService } from '@/services/serviceOrderService';

const ServiceOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: serviceOrders, isLoading } = useQuery({
    queryKey: ['service-orders', searchTerm, statusFilter],
    queryFn: () => serviceOrderService.getServiceOrders({
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['service-order-stats'],
    queryFn: () => serviceOrderService.getStats(),
  });

  const deleteServiceOrderMutation = useMutation({
    mutationFn: serviceOrderService.deleteServiceOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order-stats'] });
      toast({
        title: 'Éxito',
        description: 'Orden de arreglo eliminada correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la orden de arreglo',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      serviceOrderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order-stats'] });
      toast({
        title: 'Éxito',
        description: 'Estado actualizado correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      in_progress: { label: 'En Progreso', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'default' as const },
      delivered: { label: 'Entregado', variant: 'default' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Baja', variant: 'secondary' as const },
      medium: { label: 'Media', variant: 'default' as const },
      high: { label: 'Alta', variant: 'destructive' as const },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      accessorKey: 'order_number',
      header: 'Número',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="font-medium">{row.original.order_number}</div>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: 'Cliente',
      cell: ({ row }: { row: { original: any } }) => (
        <div>
          <div className="font-medium">{row.original.customer_name}</div>
          <div className="text-sm text-muted-foreground">{row.original.customer_phone}</div>
        </div>
      ),
    },
    {
      accessorKey: 'service_type',
      header: 'Tipo de Servicio',
    },
    {
      accessorKey: 'problem_description',
      header: 'Problema',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="max-w-xs truncate" title={row.original.problem_description}>
          {row.original.problem_description}
        </div>
      ),
    },
    {
      accessorKey: 'estimated_cost',
      header: 'Costo Estimado',
      cell: ({ row }: { row: { original: any } }) => formatCurrency(row.original.estimated_cost),
    },
    {
      accessorKey: 'deadline',
      header: 'Fecha Límite',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="text-sm">
          {formatDate(row.original.deadline)}
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      cell: ({ row }: { row: { original: any } }) => getPriorityBadge(row.original.priority),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }: { row: { original: any } }) => getStatusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/service-orders/${row.original.id}`)}
          >
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/service-orders/${row.original.id}/edit`)}
          >
            Editar
          </Button>
          {row.original.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatusMutation.mutate({ id: row.original.id, status: 'in_progress' })}
            >
              Iniciar
            </Button>
          )}
          {row.original.status === 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatusMutation.mutate({ id: row.original.id, status: 'completed' })}
            >
              Completar
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteServiceOrderMutation.mutate(row.original.id)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const statsCards = [
    {
      title: 'Total Órdenes',
      value: stats?.total_orders || 0,
      subtitle: 'Este mes',
      icon: Wrench,
      color: 'text-blue-600',
    },
    {
      title: 'Pendientes',
      value: stats?.pending_orders || 0,
      subtitle: 'Por iniciar',
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'En Progreso',
      value: stats?.in_progress_orders || 0,
      subtitle: 'Trabajando',
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
    {
      title: 'Completadas',
      value: stats?.completed_orders || 0,
      subtitle: 'Terminadas',
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Arreglo</h1>
          <p className="text-muted-foreground">
            Gestiona las reparaciones de monturas y lentes
          </p>
        </div>
        <Button onClick={() => navigate('/admin/service-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
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
          <CardTitle>Órdenes de Arreglo</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, número de orden..."
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
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="delivered">Entregado</option>
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
            data={serviceOrders?.data || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceOrders; 