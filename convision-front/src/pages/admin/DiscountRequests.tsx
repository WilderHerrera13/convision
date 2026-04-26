import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Check, Clock, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { formatDateTime12h } from '@/lib/utils';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import DiscountDetailModal from '@/components/discounts/DiscountDetailModal';
import PageLayout from '@/components/layouts/PageLayout';

// Types for discount requests
interface User {
  id: number;
  name: string;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
}

interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: number;
}

interface DiscountRequest {
  id: number;
  user_id: number;
  lens_id: number;
  patient_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  discount_percentage: number;
  original_price: number;
  discounted_price: number;
  reason?: string;
  rejection_reason?: string;
  approved_by?: number;
  expiry_date?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  lens?: Lens;
  patient?: Patient;
  approver?: User;
}

// Component
const DiscountRequests: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscountRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<Lens | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Mutation to approve a discount request
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/api/v1/discount-requests/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({
        title: "Solicitud aprobada",
        description: "La solicitud de descuento ha sido aprobada con éxito.",
      });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Hubo un error al aprobar la solicitud.",
        variant: "destructive",
      });
    },
  });

  // Mutation to reject a discount request
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/api/v1/discount-requests/${id}/reject`, {
        rejection_reason: reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud de descuento ha sido rechazada.",
      });
      setIsRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Hubo un error al rechazar la solicitud.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleApprove = (request: DiscountRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleOpenRejectModal = (request: DiscountRequest) => {
    setSelectedRequest(request);
    setIsRejectionModalOpen(true);
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({
        id: selectedRequest.id,
        reason: rejectionReason
      });
    } else {
      toast({
        title: "Error",
        description: "Debe proporcionar un motivo para el rechazo.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No expira";
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const safePriceFormat = (price: number | string | undefined | null): string => {
    if (price === undefined || price === null) return "0.00";
    try {
      return Number(price).toFixed(2);
    } catch (e) {
      console.error("Error formatting price:", e);
      return "0.00";
    }
  };

  const handleLensSelect = (lens: Lens) => {
    setSelectedLens(lens);
    setIsCreateModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedLens(null);
    setIsCreateModalOpen(true);
  };

  const handleViewDetails = (request: DiscountRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" /> Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" /> Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: DataTableColumnDef<DiscountRequest>[] = [
    {
      id: 'lens',
      header: 'Lente',
      type: 'text',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{r.lens?.identifier}</span>
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{r.lens?.description}</span>
        </div>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (r) => r.is_global
        ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Global</Badge>
        : r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : '-',
    },
    {
      id: 'discount_percentage',
      header: 'Descuento',
      type: 'text',
      cell: (r) => <Badge className="bg-purple-100 text-purple-800 border-purple-200">{r.discount_percentage}%</Badge>,
    },
    {
      id: 'price',
      header: 'Precio',
      type: 'text',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="line-through text-xs text-gray-400">${safePriceFormat(r.original_price)}</span>
          <span className="font-medium text-green-600">${safePriceFormat(r.discounted_price)}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (r) => renderStatus(r.status),
    },
    {
      id: 'requested_by',
      header: 'Solicitado por',
      type: 'text',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-sm">{r.user?.name}</span>
          <span className="text-xs text-gray-500">{formatDateTime12h(r.created_at)}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Ver detalles',
          onClick: (r: DiscountRequest) => handleViewDetails(r),
        },
        {
          label: 'Aprobar',
          icon: <Check className="h-4 w-4 mr-1" />,
          onClick: (r: DiscountRequest) => handleApprove(r),
          show: (r: DiscountRequest) => r.status === 'pending',
        },
        {
          label: 'Rechazar',
          icon: <X className="h-4 w-4 mr-1" />,
          onClick: (r: DiscountRequest) => handleOpenRejectModal(r),
          show: (r: DiscountRequest) => r.status === 'pending',
        },
      ],
    },
  ];

  return (
    <PageLayout
      title="Gestión de Descuentos"
      actions={
        <Button onClick={handleOpenCreateModal}>
          <Plus className="mr-2 h-4 w-4" /> Crear Descuento
        </Button>
      }
    >
      <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobados</TabsTrigger>
          <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <EntityTable<DiscountRequest>
        columns={columns}
        queryKeyBase="discount-requests"
        fetcher={({ page, per_page }) =>
          api.get('/api/v1/discount-requests', {
            params: { page, per_page, ...(tab !== 'all' ? { status: tab } : {}) },
          }).then(r => ({ data: r.data.data, last_page: r.data.meta?.last_page ?? 1, total: r.data.meta?.total }))
        }
        extraFilters={{ tab }}
        onRowClick={(r) => handleViewDetails(r)}
        tableLayout="ledger"
        paginationVariant="figma"
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Solicitudes de Descuento</span>
            <span className="text-[11px] text-[#7d7d87]">Gestión de descuentos</span>
          </div>
        }
        emptyStateNode={<EmptyState variant="default" title="Sin solicitudes de descuento" description="No hay solicitudes de descuento registradas." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />

      {/* Rejection Modal */}
      <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud de Descuento</DialogTitle>
            <DialogDescription>
              Por favor, proporcione un motivo para el rechazo de esta solicitud.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Motivo del Rechazo</Label>
              <Textarea
                id="rejection_reason"
                placeholder="Explique por qué está rechazando esta solicitud de descuento"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRejectionModalOpen(false);
                setRejectionReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                "Rechazar Solicitud"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <DiscountDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        discount={selectedRequest}
        isAdmin={true}
      />

      {/* Create Discount Modal */}
      <DiscountRequestModal
        lens={selectedLens}
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedLens(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
          toast({
            title: "Descuento creado",
            description: "El descuento ha sido creado exitosamente",
          });
        }}
      />
      </div>
    </PageLayout>
  );
};

export default DiscountRequests; 