import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  Plus,
  X,
  Check,
  Clock,
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { formatDateTime12h } from '@/lib/utils';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import DiscountDetailModal from '@/components/discounts/DiscountDetailModal';
import PageLayout from '@/components/layouts/PageLayout';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';

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

  const handleApprove = async (request: DiscountRequest) => {
    try {
      await api.post(`/api/v1/discount-requests/${request.id}/approve`);
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({ title: "Solicitud aprobada", description: "La solicitud de descuento ha sido aprobada con éxito." });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Hubo un error al aprobar la solicitud.", variant: "destructive" });
    }
  };

  const handleOpenRejectModal = (request: DiscountRequest) => {
    setSelectedRequest(request);
    setIsRejectionModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({ title: "Error", description: "Debe proporcionar un motivo para el rechazo.", variant: "destructive" });
      return;
    }
    try {
      await api.post(`/api/v1/discount-requests/${selectedRequest.id}/reject`, { rejection_reason: rejectionReason });
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({ title: "Solicitud rechazada", description: "La solicitud de descuento ha sido rechazada." });
      setIsRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Hubo un error al rechazar la solicitud.", variant: "destructive" });
    }
  };

  const handleViewDetails = (request: DiscountRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedLens(null);
    setIsCreateModalOpen(true);
  };

  const safePriceFormat = (price: number | string | undefined | null): string => {
    if (price === undefined || price === null) return "0.00";
    try { return Number(price).toFixed(2); } catch { return "0.00"; }
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return "No expira";
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const renderStatus = (status: string) => {
    if (status === 'pending') return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    if (status === 'approved') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" /> Aprobado</Badge>;
    if (status === 'rejected') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" /> Rechazado</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const columns: DataTableColumnDef<DiscountRequest>[] = [
    { id: 'id', header: 'ID', type: 'text', accessorKey: 'id' },
    {
      id: 'lens',
      header: 'Lente',
      type: 'text',
      cell: (req) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{req.lens?.identifier}</span>
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{req.lens?.description}</span>
        </div>
      ),
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (req) => req.is_global
        ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Global</Badge>
        : req.patient
          ? `${req.patient.first_name} ${req.patient.last_name}`
          : '-'
    },
    {
      id: 'discount_percentage',
      header: 'Descuento',
      type: 'text',
      cell: (req) => <Badge className="bg-purple-100 text-purple-800 border-purple-200">{req.discount_percentage}%</Badge>,
    },
    {
      id: 'price',
      header: 'Precio',
      type: 'text',
      cell: (req) => (
        <div className="flex flex-col">
          <span className="line-through text-xs text-gray-400">${safePriceFormat(req.original_price)}</span>
          <span className="font-medium text-green-600">${safePriceFormat(req.discounted_price)}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (req) => renderStatus(req.status),
    },
    {
      id: 'requested_by',
      header: 'Solicitado por',
      type: 'text',
      cell: (req) => (
        <div className="flex flex-col">
          <span className="text-sm">{req.user?.name}</span>
          <span className="text-xs text-gray-500">{formatDateTime12h(req.created_at)}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'text',
      cell: (req) => {
        if (req.status === 'pending') {
          return (
            <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleApprove(req); }}
                className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              >
                <Check className="h-4 w-4 mr-1" />Aprobar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleOpenRejectModal(req); }}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                <X className="h-4 w-4 mr-1" />Rechazar
              </Button>
            </div>
          );
        }
        if (req.status === 'rejected' && req.rejection_reason) {
          return <div className="text-xs text-gray-500 italic">"{req.rejection_reason.substring(0, 30)}{req.rejection_reason.length > 30 ? '...' : ''}"</div>;
        }
        if (req.status === 'approved' && req.expiry_date) {
          return <div className="text-xs text-gray-500">Expira: {formatExpiryDate(req.expiry_date)}</div>;
        }
        return null;
      },
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
        <Tabs defaultValue="pending" value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="approved">Aprobados</TabsTrigger>
            <TabsTrigger value="rejected">Rechazados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <EntityTable<DiscountRequest>
          columns={columns}
          fetcher={async (params) => {
            const queryParams: Record<string, unknown> = { page: params.page, per_page: params.per_page };
            if (tab !== 'all') queryParams.status = tab;
            const response = await api.get('/api/v1/discount-requests', { params: queryParams });
            return {
              data: response.data.data,
              last_page: response.data.meta?.last_page ?? 1,
              total: response.data.meta?.total,
            };
          }}
          queryKeyBase="discount-requests"
          extraFilters={{ status: tab }}
          searchPlaceholder="Buscar solicitudes..."
          onRowClick={(req) => handleViewDetails(req)}
          toolbarLeading={
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-[#121215]">Solicitudes de Descuento</span>
              <span className="text-[11px] text-[#7d7d87]">Solicitudes pendientes de aprobación</span>
            </div>
          }
        />

        <Dialog open={isRejectionModalOpen} onOpenChange={setIsRejectionModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Rechazar Solicitud de Descuento</DialogTitle>
              <DialogDescription>Por favor, proporcione un motivo para el rechazo de esta solicitud.</DialogDescription>
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
              <Button type="button" variant="outline" onClick={() => { setIsRejectionModalOpen(false); setRejectionReason(''); }}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleReject}>
                Rechazar Solicitud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DiscountDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          discount={selectedRequest}
          isAdmin={true}
        />

        <DiscountRequestModal
          lens={selectedLens}
          isOpen={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false); setSelectedLens(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
            toast({ title: "Descuento creado", description: "El descuento ha sido creado exitosamente" });
          }}
        />
      </div>
    </PageLayout>
  );
};

export default DiscountRequests;
