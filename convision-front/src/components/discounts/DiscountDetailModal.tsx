import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Check,
  X,
  Clock,
  User,
  Tag,
  Calendar,
  Percent,
  Globe,
  DollarSign,
  Info,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { discountService } from '@/services/discountService';

interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: number;
  brand?: { name: string };
  material?: { name: string };
  lens_class?: { name: string };
  treatment?: { name: string };
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification?: string;
}

interface User {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export interface DiscountRequest {
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

interface DiscountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: DiscountRequest | null;
  isAdmin?: boolean;
}

const DiscountDetailModal: React.FC<DiscountDetailModalProps> = ({
  isOpen,
  onClose,
  discount,
  isAdmin = false
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  
  // Mutation to approve a discount request
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await discountService.approveDiscountRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({
        title: "Solicitud aprobada",
        description: "La solicitud de descuento ha sido aprobada con éxito.",
      });
      onClose();
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
      return await discountService.rejectDiscountRequest(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud de descuento ha sido rechazada.",
      });
      setIsRejectionModalOpen(false);
      setRejectionReason('');
      onClose();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Hubo un error al rechazar la solicitud.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (discount) {
      approveMutation.mutate(discount.id);
    }
  };

  const handleOpenRejectModal = () => {
    setIsRejectionModalOpen(true);
  };

  const handleReject = () => {
    if (discount && rejectionReason.trim()) {
      rejectMutation.mutate({
        id: discount.id,
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

  if (!discount) return null;

  const formatPrice = (price: number | string | undefined | null): string => {
    if (price === undefined || price === null) return "0.00";
    try {
      return Number(price).toLocaleString('es-CO', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } catch {
      return "0.00";
    }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No establecida";
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              Detalle de Solicitud de Descuento #{discount.id}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Status section */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="font-medium">Estado:</div>
              <div>{renderStatus(discount.status)}</div>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                  <Info className="h-4 w-4 mr-2 text-blue-500" />
                  Información General
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Descuento:</div>
                  <div className="font-medium">{discount.discount_percentage}%</div>

                  <div className="text-gray-500">Tipo:</div>
                  <div className="font-medium">
                    {discount.is_global ? (
                      <div className="flex items-center">
                        <Globe className="h-3 w-3 mr-1 text-blue-500" />
                        Global
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1 text-green-500" />
                        Individual
                      </div>
                    )}
                  </div>

                  <div className="text-gray-500">Fecha de creación:</div>
                  <div className="font-medium">
                    {formatDate(discount.created_at)}
                  </div>

                  <div className="text-gray-500">Expiración:</div>
                  <div className="font-medium">
                    {discount.expiry_date ? formatDate(discount.expiry_date) : "No expira"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Información de Precios
                </h3>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-3 rounded-md border border-purple-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Precio original:</span>
                    <span className="text-sm line-through text-gray-500">${formatPrice(discount.original_price)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Descuento:</span>
                    <span className="text-sm text-purple-600">-${formatPrice(discount.original_price - discount.discounted_price)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-purple-100">
                    <span className="text-sm font-bold text-gray-700">Precio final:</span>
                    <span className="text-lg font-bold text-green-600">${formatPrice(discount.discounted_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lens Details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                <Tag className="h-4 w-4 mr-2 text-purple-500" />
                Información del Lente
              </h3>
              {discount.lens ? (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                  <div className="flex flex-col">
                    <span className="font-medium">{discount.lens.description}</span>
                    <div className="text-sm text-gray-600 mt-1">
                      <div><span className="font-medium">Código:</span> {discount.lens.internal_code}</div>
                      <div><span className="font-medium">Identificador:</span> {discount.lens.identifier}</div>
                      {discount.lens.brand && <div><span className="font-medium">Marca:</span> {discount.lens.brand.name}</div>}
                      {discount.lens.material && <div><span className="font-medium">Material:</span> {discount.lens.material.name}</div>}
                      {discount.lens.lens_class && <div><span className="font-medium">Tipo:</span> {discount.lens.lens_class.name}</div>}
                      {discount.lens.treatment && <div><span className="font-medium">Tratamiento:</span> {discount.lens.treatment.name}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 italic">Información del lente no disponible</div>
              )}
            </div>

            {/* Patient Details */}
            {!discount.is_global && discount.patient && (
              <div>
                <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                  <User className="h-4 w-4 mr-2 text-green-500" />
                  Información del Paciente
                </h3>
                <div className="bg-green-50 p-3 rounded-md border border-green-100">
                  <div className="text-sm">
                    <div className="font-medium">{discount.patient.first_name} {discount.patient.last_name}</div>
                    {discount.patient.identification && (
                      <div className="text-gray-600 mt-1">
                        <span className="font-medium">Identificación:</span> {discount.patient.identification}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Approval/Rejection Details */}
            {discount.status !== 'pending' && (
              <div>
                <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                  {discount.status === 'approved' ? (
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 mr-2 text-red-500" />
                  )}
                  {discount.status === 'approved' ? 'Información de Aprobación' : 'Información de Rechazo'}
                </h3>
                <div className={`p-3 rounded-md border ${discount.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  {discount.approver && (
                    <div className="text-sm">
                      <div className="font-medium">Aprobado/Rechazado por: {discount.approver.name}</div>
                      <div className="text-gray-600 mt-1">
                        <span className="font-medium">Fecha:</span> {formatDate(discount.updated_at)}
                      </div>
                    </div>
                  )}
                  
                  {discount.status === 'rejected' && discount.rejection_reason && (
                    <div className="mt-2">
                      <div className="text-sm font-medium">Razón del rechazo:</div>
                      <div className="mt-1 text-sm p-2 bg-white rounded border border-red-200 text-gray-700">
                        {discount.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reason/Notes */}
            {discount.reason && (
              <div>
                <h3 className="text-sm font-semibold flex items-center text-gray-700 mb-2">
                  <Info className="h-4 w-4 mr-2 text-blue-500" />
                  Razón de la Solicitud
                </h3>
                <div className="p-3 rounded-md border bg-gray-50">
                  <div className="text-sm text-gray-700">{discount.reason}</div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            {isAdmin && discount.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleOpenRejectModal}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Rechazar
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Aprobar
                    </>
                  )}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default DiscountDetailModal; 