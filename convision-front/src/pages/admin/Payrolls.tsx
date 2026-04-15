import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  Calculator,
  DollarSign,
  Users,
  Calendar,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { payrollService, type Payroll } from '@/services/payrollService';
import PageLayout from '@/components/layouts/PageLayout';

const Payrolls: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: stats } = useQuery({
    queryKey: ['payroll-stats'],
    queryFn: () => payrollService.getStats(),
  });

  const deletePayrollMutation = useMutation({
    mutationFn: payrollService.deletePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      toast({
        title: 'Éxito',
        description: 'Nómina eliminada correctamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la nómina',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDeletePayroll = (payroll: Payroll) => {
    deletePayrollMutation.mutate(payroll.id);
  };

  const columns: DataTableColumnDef<Payroll>[] = [
    {
      id: 'id',
      header: 'ID',
      type: 'text',
      accessorKey: 'id',
      className: 'w-16',
    },
    {
      id: 'employee_name',
      header: 'Empleado',
      type: 'text',
      cell: (payroll: Payroll) => (
        <div>
          <div className="font-medium">{payroll.employee_name || '—'}</div>
          <div className="text-sm text-muted-foreground">ID: {payroll.employee_identification || '—'}</div>
          <div className="text-xs text-muted-foreground">{payroll.employee_position || '—'}</div>
        </div>
      ),
    },
    {
      id: 'pay_period',
      header: 'Período',
      type: 'text',
      cell: (payroll: Payroll) => (
        <div className="text-sm">
          <div>{formatDate(payroll.pay_period_start)}</div>
          <div className="text-muted-foreground">al {formatDate(payroll.pay_period_end)}</div>
        </div>
      ),
    },
    {
      id: 'base_salary',
      header: 'Salario Base',
      type: 'money',
      accessorKey: 'base_salary',
      className: 'text-right',
    },
    {
      id: 'gross_salary',
      header: 'Salario Bruto',
      type: 'money',
      accessorKey: 'gross_salary',
      className: 'text-right',
    },
    {
      id: 'total_deductions',
      header: 'Deducciones',
      type: 'money',
      cell: (payroll: Payroll) => {
        const deductions = parseFloat(String(payroll.total_deductions || 0));
        return (
          <span className="text-red-600 text-right block">
            {deductions > 0 
              ? `-${formatCurrency(deductions)}` 
              : '—'
            }
          </span>
        );
      },
      className: 'text-right',
    },
    {
      id: 'net_salary',
      header: 'Salario Neto',
      type: 'money',
      cell: (payroll: Payroll) => (
        <div className="font-medium text-green-600 text-right">
          {payroll.net_salary ? formatCurrency(payroll.net_salary) : '—'}
        </div>
      ),
      className: 'text-right',
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: {
        pending: 'secondary',
        paid: 'default',
        cancelled: 'destructive',
      },
      statusLabels: {
        pending: 'Pendiente',
        paid: 'Pagado',
        cancelled: 'Cancelado',
      },
    },
    {
      id: 'payment_method',
      header: 'Método de Pago',
      type: 'text',
      cell: (payroll: Payroll) => payroll.payment_method?.name || 'No especificado',
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Ver',
          icon: <Eye className="h-4 w-4" />,
          onClick: (payroll: Payroll) => navigate(`/admin/payrolls/${payroll.id}`),
        },
        {
          label: 'Editar',
          icon: <Edit className="h-4 w-4" />,
          onClick: (payroll: Payroll) => navigate(`/admin/payrolls/${payroll.id}/edit`),
        },
        {
          label: 'Eliminar',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: (payroll: Payroll) => handleDeletePayroll(payroll),
          variant: 'destructive' as const,
        },
      ],
    },
  ];

  const statsCards = [
    {
      title: 'Total Nóminas',
      value: stats?.total_payrolls || 0,
      subtitle: 'Este mes',
      icon: UserCheck,
      color: 'text-blue-600',
    },
    {
      title: 'Total Pagado',
      value: formatCurrency(stats?.total_paid || 0),
      subtitle: 'Este mes',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Empleados',
      value: stats?.total_employees || 0,
      subtitle: 'Activos',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Pendientes',
      value: stats?.pending_payrolls || 0,
      subtitle: 'Por pagar',
      icon: Calendar,
      color: 'text-orange-600',
    },
  ];

  return (
    <PageLayout
      title="Nómina"
      subtitle="Gestiona los pagos de empleados y nóminas"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/payrolls/calculate')}>
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Nómina
          </Button>
          <Button onClick={() => navigate('/admin/payrolls/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nómina
          </Button>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Nóminas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
          <EntityTable<Payroll>
            columns={columns}
            queryKeyBase="payrolls"
            fetcher={({ page, per_page, search }) => payrollService.getPayrolls({
              page,
              per_page,
              search,
              status: statusFilter !== 'all' ? statusFilter : undefined,
            })}
            searchPlaceholder="Buscar por empleado..."
            initialPerPage={15}
            extraFilters={{ status: statusFilter }}
          />
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
};

export default Payrolls; 