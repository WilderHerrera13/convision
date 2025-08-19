import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
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

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [filters, setFilters] = useState<PurchaseSearchParams>({});



  const { data: purchasesData, isLoading, error } = useQuery({
    queryKey: ['purchases', page, perPage, search, filters],
    queryFn: () => purchaseService.getPurchases({
      ...filters,
      search,
      page,
      per_page: perPage,
    }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseService.deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({
        title: 'Compra eliminada',
        description: 'La compra ha sido eliminada exitosamente.',
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar la compra.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleViewPurchase = (purchase: Purchase) => {
    navigate(`/admin/purchases/${purchase.id}`);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    navigate(`/admin/purchases/${purchase.id}/edit`);
  };

  const handleDeletePurchase = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete && purchaseToDelete.id) {
      const purchaseId = purchaseToDelete.id;
      setIsDeleteModalOpen(false);
      setPurchaseToDelete(null);
      deleteMutation.mutate(purchaseId);
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo identificar la compra a eliminar.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'partial':
        return 'Parcial';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  const columns: DataTableColumnDef<Purchase>[] = [
    {
      id: 'invoice_number',
      header: 'N° Factura',
      type: 'text',
      accessorKey: 'invoice_number',
    },
    {
      id: 'supplier',
      header: 'Proveedor',
      type: 'text',
      cell: (purchase: Purchase) => {
        return purchase.supplier?.name || '-';
      },
    },
    {
      id: 'purchase_date',
      header: 'Fecha',
      type: 'date',
      accessorKey: 'purchase_date',
    },
    {
      id: 'concept',
      header: 'Concepto',
      type: 'text',
      accessorKey: 'concept',
    },
    {
      id: 'total_amount',
      header: 'Total',
      type: 'money',
      accessorKey: 'total_amount',
    },
    {
      id: 'balance',
      header: 'Saldo',
      type: 'money',
      accessorKey: 'balance',
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'status',
      accessorKey: 'status',
      statusVariants: {
        paid: 'success',
        partial: 'warning',
        pending: 'destructive',
      },
      statusLabels: {
        paid: 'Pagado',
        partial: 'Parcial',
        pending: 'Pendiente',
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (purchase: Purchase) => {
        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewPurchase(purchase)}
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditPurchase(purchase)}
              title="Editar compra"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeletePurchase(purchase)}
              title="Eliminar compra"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const purchases = purchasesData?.data || [];
  const totalPages = purchasesData?.last_page || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">
            Gestiona las compras y facturas de proveedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={perPage.toString()}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="15">15 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => navigate('/admin/purchases/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Compra
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Compras
                </p>
                <p className="text-2xl font-bold">{purchasesData?.total || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pendientes
                </p>
                <p className="text-2xl font-bold">
                  {purchases.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pagadas
                </p>
                <p className="text-2xl font-bold">
                  {purchases.filter(p => p.status === 'paid').length}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Proveedores
                </p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={purchases}
            columns={columns}
            loading={isLoading}
            error={error?.message}
            onRowClick={handleViewPurchase}
            enableSearch={true}
            onSearch={handleSearch}
            searchPlaceholder="Buscar por número de factura, proveedor o concepto..."
            enablePagination={true}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases; 