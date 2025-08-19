import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  Check,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import DiscountDetailModal from '@/components/discounts/DiscountDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumnDef } from '@/components/ui/data-table';

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
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Query to fetch all discount requests (not just the current user's)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discount-requests', tab, currentPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 10,
      };

      // Set status based on active tab
      if (tab !== 'all') {
        params.status = tab;
      }

      const response = await api.get('/api/v1/discount-requests', { params });
      return response.data;
    },
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

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
  const columns: DataTableColumnDef[] = [
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
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{request.lens?.identifier}</span>
            <span className="text-xs text-gray-500 truncate max-w-[150px]">{request.lens?.description}</span>
          </div>
        );
      }
    },
    {
      id: 'patient',
      header: 'Paciente',
      type: 'text',
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
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
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            {request.discount_percentage}%
          </Badge>
        );
      }
    },
    {
      id: 'price',
      header: 'Precio',
      type: 'text',
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
        return (
          <div className="flex flex-col">
            <span className="line-through text-xs text-gray-400">${safePriceFormat(request.original_price)}</span>
            <span className="font-medium text-green-600">${safePriceFormat(request.discounted_price)}</span>
          </div>
        );
      }
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
        return renderStatus(request.status);
      }
    },
    {
      id: 'date',
      header: 'Fecha',
      type: 'text',
      cell: ({ row }) => {
        const request = row.original as DiscountRequest;
        return (
          <div>
            <span className="text-xs text-gray-500">{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}</span>
            {request.status === 'rejected' && request.rejection_reason && (
              <div className="mt-1 text-xs text-red-500">
                Razón: {request.rejection_reason}
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: "actions",
      header: "Acciones",
      type: "custom",
      cell: ({ row }) => {
        const discount = row.original as DiscountRequest;
        return (
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
        );
      }
    }
  ];

  function renderDiscountRequestsContent(status: string) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 py-8">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-700">Cargando solicitudes</h3>
          <p className="text-gray-500">Espere mientras se cargan las solicitudes de descuento...</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 py-8">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Error al cargar solicitudes</h3>
          <p className="text-gray-500 max-w-md text-center mb-4">
            No se pudieron cargar las solicitudes de descuento. Por favor, intente nuevamente.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
          </Button>
        </div>
      );
    }

    const discountRequests = data?.data || [];
    const totalPages = data?.meta?.last_page || 1;

    return (
      <DataTable
        data={discountRequests}
        columns={columns}
        loading={isLoading}
        error={isError ? "Error al cargar los datos" : undefined}
        emptyMessage="No se encontraron solicitudes de descuento para este estado."
        enablePagination={true}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowClick={(row) => handleViewDiscountDetail(row as DiscountRequest)}
      />
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Descuento</h1>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Solicitud
        </Button>
      </div>

      <Tabs defaultValue="pending" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobados</TabsTrigger>
          <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="p-0">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsContent('pending')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="p-0">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Aprobadas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsContent('approved')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="p-0">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Rechazadas</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsContent('rejected')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="p-0">
          <Card>
            <CardHeader>
              <CardTitle>Todas las Solicitudes</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsContent('all')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discount Creation Modal */}
      <DiscountRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lens={null}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['discount-requests', tab] });
          toast({
            title: "Solicitud enviada",
            description: "Su solicitud de descuento ha sido enviada exitosamente",
          });
        }}
      />
      
      {/* Discount Detail Modal */}
      <DiscountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        discount={selectedDiscount}
        isAdmin={false}
      />
    </div>
  );
};

export default DiscountRequests; 