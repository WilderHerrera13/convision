import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Play,
  Trash,
} from 'lucide-react';
import { serviceOrderService, ServiceOrder } from '@/services/serviceOrderService';
import PageLayout from '@/components/layouts/PageLayout';

const ServiceOrders: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

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

  const columns: DataTableColumnDef<ServiceOrder>[] = [
    {
      id: 'order_number',
      header: 'Número',
      type: 'text',
      accessorKey: 'order_number',
      cell: (row) => <div className="font-medium">{row.order_number}</div>,
    },
    {
      id: 'customer_name',
      header: 'Cliente',
      type: 'text',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          <div className="text-sm text-muted-foreground">{row.customer_phone}</div>
        </div>
      ),
    },
    {
      id: 'service_type',
      header: 'Tipo de Servicio',
      type: 'text',
      accessorKey: 'service_type',
    },
    {
      id: 'problem_description',
      header: 'Problema',
      type: 'text',
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.problem_description}>
          {row.problem_description}
        </div>
      ),
    },
    {
      id: 'estimated_cost',
      header: 'Costo Estimado',
      type: 'money',
      cell: (row) => formatCurrency(row.estimated_cost || 0),
    },
    {
      id: 'deadline',
      header: 'Fecha Límite',
      type: 'date',
      cell: (row) => <div className="text-sm">{formatDate(row.deadline)}</div>,
    },
    {
      id: 'priority',
      header: 'Prioridad',
      type: 'custom',
      cell: (row) => getPriorityBadge(row.priority),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'custom',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Ver',
          icon: <Eye className="h-4 w-4 mr-2" />,
          onClick: (row) => navigate(`/admin/service-orders/${row.id}`),
          variant: 'outline',
        },
        {
          label: 'Editar',
          icon: <Edit className="h-4 w-4 mr-2" />,
          onClick: (row) => navigate(`/admin/service-orders/${row.id}/edit`),
          variant: 'outline',
        },
        {
          label: 'Iniciar',
          show: (row: ServiceOrder) => row.status === 'pending',
          icon: <Play className="h-4 w-4 mr-2" />,
          onClick: (row) => updateStatusMutation.mutate({ id: row.id, status: 'in_progress' }),
          variant: 'outline',
        },
        {
          label: 'Completar',
          show: (row: ServiceOrder) => row.status === 'in_progress',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          onClick: (row) => updateStatusMutation.mutate({ id: row.id, status: 'completed' }),
          variant: 'outline',
        },
        {
          label: 'Eliminar',
          icon: <Trash className="h-4 w-4 mr-2" />,
          onClick: (row: ServiceOrder) => deleteServiceOrderMutation.mutate(row.id),
          variant: 'destructive',
        },
      ],
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
    <PageLayout
      title="Órdenes de Arreglo"
      subtitle="Gestiona las reparaciones de monturas y lentes"
      actions={
        <Button onClick={() => navigate('/admin/service-orders/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
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

      <div className="flex gap-2 mb-4">
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
      </div>
      <EntityTable<ServiceOrder>
        columns={columns}
        queryKeyBase="service-orders"
        fetcher={({ page, per_page, search }) =>
          serviceOrderService.getServiceOrders({
            page,
            per_page,
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          }).then((r) => ({ data: r.data || [], last_page: r.last_page ?? 1, total: r.total }))
        }
        searchPlaceholder="Buscar por cliente, número de orden..."
        extraFilters={{ statusFilter }}
        onRowClick={(row) => navigate(`/admin/service-orders/${row.id}`)}
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Órdenes de Arreglo</span>
            <span className="text-[11px] text-[#7d7d87]">Gestión de reparaciones</span>
          </div>
        }
      />
      </div>
    </PageLayout>
  );
};

export default ServiceOrders; 