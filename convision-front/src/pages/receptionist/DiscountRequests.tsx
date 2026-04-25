import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Check, X } from 'lucide-react';
import api from '@/lib/axios';
import { formatDateTime12h } from '@/lib/utils';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import DiscountDetailModal from '@/components/discounts/DiscountDetailModal';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import PageLayout from '@/components/layouts/PageLayout';

// Types for discount requests
interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: number;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
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
  expiry_date?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  lens?: Lens;
  patient?: Patient;
  user?: {
    id: number;
    name: string;
    email: string;
  }
}

const DiscountRequests: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDiscountDetail = (discount: DiscountRequest) => {
    setSelectedDiscount(discount);
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

  const safePriceFormat = (price: number | string | undefined | null): string => {
    if (price === undefined || price === null) return "0.00";
    try {
      return Number(price).toFixed(2);
    } catch (e) {
      console.error("Error formatting price:", e);
      return "0.00";
    }
  };
  
  // Define columns for the DataTable
  const columns: DataTableColumnDef<DiscountRequest>[] = [
    {
      id: 'id',
      header: 'ID',
      type: 'number',
      accessorKey: 'id'
    },
    {
      id: 'lens',
      header: 'Lente',
      type: 'text',
      cell: (request) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{request.lens?.identifier}</span>
            <span className="text-xs text-gray-500 truncate max-w-[150px]">{request.lens?.description}</span>
          </div>
      )
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: (request) => {
        if (request.is_global) {
          return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Global
            </Badge>
          );
        } else if (request.patient) {
          return `${request.patient.first_name} ${request.patient.last_name}`;
        } else {
          return "-";
        }
      }
    },
    {
      id: 'discount_percentage',
      header: 'Descuento',
      type: 'text',
      cell: (request) => (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            {request.discount_percentage}%
          </Badge>
      )
    },
    {
      id: 'price',
      header: 'Precio',
      type: 'text',
      cell: (request) => (
          <div className="flex flex-col">
            <span className="line-through text-xs text-gray-400">${safePriceFormat(request.original_price)}</span>
            <span className="font-medium text-green-600">${safePriceFormat(request.discounted_price)}</span>
          </div>
      )
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (request) => renderStatus(request.status)
    },
    {
      id: 'date',
      header: 'Fecha',
      type: 'text',
      cell: (request) => (
          <div>
            <span className="text-xs text-gray-500">{formatDateTime12h(request.created_at)}</span>
            {request.status === 'rejected' && request.rejection_reason && (
              <div className="mt-1 text-xs text-red-500">
                Razón: {request.rejection_reason}
              </div>
            )}
          </div>
      )
    },
    {
      id: "actions",
      header: "Acciones",
      type: "custom",
      cell: (discount) => (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleViewDiscountDetail(discount);
            }}
          >
            Ver detalles
          </Button>
      )
    }
  ];

  return (
    <PageLayout
      title="Solicitudes de Descuento"
      subtitle="Gestión de solicitudes de descuento"
      actions={
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Solicitud
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full mb-4">
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
        onRowClick={(discount) => { setSelectedDiscount(discount); setIsDetailModalOpen(true); }}
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Solicitudes de Descuento</span>
            <span className="text-[11px] text-[#7d7d87]">Listado de solicitudes</span>
          </div>
        }
      />

      <DiscountRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lens={null}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
          toast({
            title: "Solicitud enviada",
            description: "Su solicitud de descuento ha sido enviada exitosamente",
          });
        }}
      />

      <DiscountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        discount={selectedDiscount}
        isAdmin={false}
      />
    </PageLayout>
  );
};

export default DiscountRequests; 