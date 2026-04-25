import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  Calendar,
  Building2,
} from 'lucide-react';
import {
  purchaseService,
  Purchase,
  PurchaseSearchParams,
} from '@/services/purchaseService';
import { supplierService } from '@/services/supplierService';
import PageLayout from '@/components/layouts/PageLayout';

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [filters] = useState<PurchaseSearchParams>({});

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseService.deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Compra eliminada', description: 'La compra ha sido eliminada exitosamente.' });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la compra.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  const handleViewPurchase = (purchase: Purchase) => navigate(`/admin/purchases/${purchase.id}`);
  const handleEditPurchase = (purchase: Purchase) => navigate(`/admin/purchases/${purchase.id}/edit`);

  const handleDeletePurchase = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete?.id) {
      const purchaseId = purchaseToDelete.id;
      setIsDeleteModalOpen(false);
      setPurchaseToDelete(null);
      deleteMutation.mutate(purchaseId);
    } else {
      toast({ title: 'Error', description: 'No se pudo identificar la compra a eliminar.', variant: 'destructive' });
    }
  };

  const columns: DataTableColumnDef<Purchase>[] = [
    { id: 'invoice_number', header: 'N° Factura', type: 'text', accessorKey: 'invoice_number' },
    { id: 'supplier', header: 'Proveedor', type: 'text', accessorKey: 'supplier.name' },
    { id: 'purchase_date', header: 'Fecha', type: 'date', accessorKey: 'purchase_date' },
    { id: 'concept', header: 'Concepto', type: 'text', accessorKey: 'concept' },
    { id: 'total_amount', header: 'Total', type: 'money', accessorKey: 'total_amount' },
    { id: 'balance', header: 'Saldo', type: 'money', accessorKey: 'balance' },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: { paid: 'success', partial: 'warning', pending: 'destructive' },
      statusLabels: { paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente' },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        { label: 'Ver detalles', icon: <Eye className="h-4 w-4" />, onClick: (purchase: Purchase) => handleViewPurchase(purchase) },
        { label: 'Editar compra', icon: <Edit className="h-4 w-4" />, onClick: (purchase: Purchase) => handleEditPurchase(purchase) },
        { label: 'Eliminar compra', icon: <Trash2 className="h-4 w-4" />, onClick: (purchase: Purchase) => handleDeletePurchase(purchase), variant: 'destructive' },
      ],
    },
  ];

  return (
    <PageLayout
      title="Compras"
      subtitle="Gestiona las compras y facturas de proveedores"
      actions={
        <Button onClick={() => navigate('/admin/purchases/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Compra
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proveedores</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <EntityTable<Purchase>
          columns={columns}
          queryKeyBase="purchases"
          fetcher={(params) => purchaseService.getPurchases({ ...filters, page: params.page, per_page: params.per_page, search: params.search })}
          onRowClick={handleViewPurchase}
          searchPlaceholder="Buscar por número de factura, proveedor o concepto..."
          initialPerPage={15}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Compras</span>
              <span className="text-[11px] text-[#7d7d87]">Lista de compras y facturas</span>
            </div>
          }
          toolbarTrailing={
            <Button size="sm" onClick={() => navigate('/admin/purchases/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Compra
            </Button>
          }
        />

        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar la compra "{purchaseToDelete?.invoice_number}"?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default Purchases;
