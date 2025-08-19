import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  X,
  Check,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  DollarSign,
  Percent,
  Tag,
  Loader2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import { format } from 'date-fns';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import DiscountDetailModal from '@/components/discounts/DiscountDetailModal';

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscountRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<Lens | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const perPage = 10;

  // Query to fetch discount requests
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discount-requests', page, tab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };

      // Set status based on active tab
      if (tab !== 'all') {
        params.status = tab;
      }

      const response = await api.get('/api/v1/discount-requests', { params });
      return response.data;
    },
  });

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

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Descuentos</h1>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="mr-2 h-4 w-4" /> Crear Descuento
        </Button>
      </div>

      <Tabs defaultValue="pending" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="approved">Aprobados</TabsTrigger>
          <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Descuento Pendientes</CardTitle>
              <CardDescription>
                Revise y apruebe las solicitudes de descuento enviadas por los recepcionistas.
              </CardDescription>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsTable('pending')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Descuentos Aprobados</CardTitle>
              <CardDescription>
                Lista de todos los descuentos aprobados y activos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsTable('approved')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Rechazadas</CardTitle>
              <CardDescription>
                Lista de solicitudes de descuento que han sido rechazadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsTable('rejected')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas las Solicitudes</CardTitle>
              <CardDescription>
                Historial completo de solicitudes de descuento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDiscountRequestsTable('all')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
  );

  function renderDiscountRequestsTable(status: string) {
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

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Lente</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Solicitado por</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.length > 0 ? (
              data.data.map((request: DiscountRequest) => (
                <TableRow 
                  key={request.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetails(request)}
                >
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{request.lens?.identifier}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[150px]">{request.lens?.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.is_global ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Global
                      </Badge>
                    ) : request.patient ? (
                      `${request.patient.first_name} ${request.patient.last_name}`
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      {request.discount_percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="line-through text-xs text-gray-400">${safePriceFormat(request.original_price)}</span>
                      <span className="font-medium text-green-600">${safePriceFormat(request.discounted_price)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{renderStatus(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{request.user?.name}</span>
                      <span className="text-xs text-gray-500">{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {request.status === 'pending' && (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request);
                          }}
                          disabled={approveMutation.isPending}
                          className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRejectModal(request);
                          }}
                          disabled={rejectMutation.isPending}
                          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="text-xs text-gray-500 italic">
                        "{request.rejection_reason.substring(0, 30)}{request.rejection_reason.length > 30 ? '...' : ''}"
                      </div>
                    )}
                    {request.status === 'approved' && request.expiry_date && (
                      <div className="text-xs text-gray-500">
                        Expira: {formatDate(request.expiry_date)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-64">
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                      <Percent className="h-8 w-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No hay solicitudes de descuento</h3>
                    <p className="text-gray-500 max-w-md">
                      {status === 'pending' 
                        ? 'No hay solicitudes pendientes de revisión en este momento.' 
                        : status === 'approved'
                        ? 'No hay descuentos aprobados en el sistema actualmente.'
                        : status === 'rejected'
                        ? 'No hay solicitudes rechazadas en el sistema actualmente.'
                        : 'No hay solicitudes de descuento registradas en el sistema.'}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Crear nuevo descuento
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data?.meta && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Mostrando {data.meta.from || 0} a {data.meta.to || 0} de {data.meta.total} solicitudes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.meta.last_page}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }
};

export default DiscountRequests; 