import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Eye, Edit, Trash2, DollarSign, FileText, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { expenseService, type Expense } from '@/services/expenseService';
import EntityTable from '@/components/ui/data-table/EntityTable';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';
import { DataTableColumnDef } from '@/components/ui/data-table';

const Expenses: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const columns: DataTableColumnDef<Expense>[] = [
    {
      id: 'expense_date',
      header: 'Fecha',
      type: 'date',
      accessorKey: 'expense_date',
    },
    {
      id: 'invoice_number',
      header: 'Factura',
      type: 'text',
      accessorKey: 'invoice_number',
    },
    {
      id: 'supplier',
      header: 'Proveedor',
      type: 'text',
      accessorKey: 'supplier.name',
    },
    {
      id: 'concept',
      header: 'Concepto',
      type: 'text',
      accessorKey: 'concept',
    },
    {
      id: 'amount',
      header: 'Monto',
      type: 'money',
      accessorKey: 'amount',
      className: 'text-right'
    },
    {
      id: 'payment_amount',
      header: 'Pagado',
      type: 'money',
      accessorKey: 'payment_amount',
      className: 'text-right'
    },
    {
      id: 'balance',
      header: 'Saldo',
      type: 'money',
      accessorKey: 'balance',
      className: 'text-right'
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: { paid: 'default', partial: 'secondary', pending: 'destructive' },
      statusLabels: { paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente' },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Ver',
          icon: <Eye className="h-4 w-4" />,
          onClick: (expense: Expense) => navigate(`/admin/expenses/${expense.id}`),
        },
        {
          label: 'Editar',
          icon: <Edit className="h-4 w-4" />,
          onClick: (expense: Expense) => navigate(`/admin/expenses/${expense.id}/edit`),
        },
        {
          label: 'Eliminar',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: (expense: Expense) => handleDeleteExpense(expense),
          variant: 'destructive' as const,
        },
      ],
    },
  ];

  const handleDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete && expenseToDelete.id) {
      try {
        await expenseService.deleteExpense(expenseToDelete.id);
        toast({
          title: 'Gasto eliminado',
          description: 'El gasto ha sido eliminado exitosamente.',
        });
        setIsDeleteModalOpen(false);
        setExpenseToDelete(null);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Error al eliminar el gasto.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el gasto a eliminar.',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageLayout
      title="Gastos"
      subtitle="Gestión de gastos y proveedores"
      actions={
        <Button onClick={() => navigate('/admin/expenses/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      }
    >
      <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <EntityTable<Expense>
        columns={columns}
        queryKeyBase="expenses"
        fetcher={({ page, per_page }) => expenseService.getExpenses({ page, per_page })}
        searchPlaceholder="Buscar por factura, proveedor o concepto..."
        tableLayout="ledger"
        paginationVariant="figma"
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Gastos</span>
            <span className="text-[11px] text-[#7d7d87]">Gestión de gastos</span>
          </div>
        }
        emptyStateNode={<EmptyState variant="default" title="Sin gastos registrados" description="No hay gastos registrados aún." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el gasto "{expenseToDelete?.invoice_number}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
};

export default Expenses;
