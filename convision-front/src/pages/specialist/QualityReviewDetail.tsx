import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import ApproveModal from '@/components/quality-review/ApproveModal';
import ReturnModal from '@/components/quality-review/ReturnModal';
import {
  LABORATORY_ORDER_STATUS_BADGE_CLASS,
  LABORATORY_ORDER_STATUS_LABELS,
} from '@/constants/laboratoryOrderStatus';

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  urgent: 'Urgente',
  normal: 'Normal',
  low: 'Baja',
};

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: 'bg-[#ffeeed] text-[#b82626]',
  urgent: 'bg-[#ffeeed] text-[#b82626]',
  normal: 'bg-[#e8f0fe] text-[#2563eb]',
  low: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: string }) {
  const cls = LABORATORY_ORDER_STATUS_BADGE_CLASS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <Badge className={`${cls} border-0`}>
      {LABORATORY_ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function OrderInfoCard({ order }: { order: LaboratoryOrder }) {
  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';
  const estimatedDate = order.estimated_completion_date
    ? new Date(order.estimated_completion_date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';
  const priorityCls = PRIORITY_BADGE_CLASS[order.priority] ?? 'bg-gray-100 text-gray-600';

  return (
    <Card className="shadow-none border-convision-border-subtle">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <InfoField label="Número de orden" value={order.order_number} />
          <InfoField label="Paciente" value={patientName} />
          <InfoField label="Laboratorio" value={order.laboratory?.name ?? '—'} />
          <InfoField label="Cajón" value={order.drawer_number ?? '—'} />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-convision-text-muted">
              Prioridad
            </span>
            <Badge className={`${priorityCls} border-0 w-fit`}>
              {PRIORITY_LABELS[order.priority] ?? order.priority}
            </Badge>
          </div>
          <InfoField label="Fecha estimada" value={estimatedDate} />
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-convision-text-muted">
              Notas / Producto
            </span>
            <span className="text-[13px] text-convision-text whitespace-pre-wrap">
              {order.notes ?? '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-convision-text-muted">
        {label}
      </span>
      <span className="text-[13px] text-convision-text">{value}</span>
    </div>
  );
}

function StatusHistoryList({ order }: { order: LaboratoryOrder }) {
  const history = order.statusHistory ?? [];
  return (
    <div className="mt-6">
      <h3 className="text-[13px] font-semibold text-convision-text mb-3">Historial de estados</h3>
      {history.length === 0 ? (
        <p className="text-[13px] text-convision-text-secondary">Sin historial disponible.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {history.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                <StatusBadge status={entry.status} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-convision-text-secondary">
                  {new Date(entry.created_at).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {entry.user ? ` · ${entry.user.name}` : ''}
                </span>
                {entry.notes && (
                  <span className="text-[13px] text-convision-text">{entry.notes}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function DecisionPanel({
  orderId,
  decision,
  setDecision,
  observations,
  setObservations,
  showValidationError,
  onConfirm,
}: {
  orderId: number;
  decision: 'approve' | 'return' | null;
  setDecision: (d: 'approve' | 'return') => void;
  observations: string;
  setObservations: (v: string) => void;
  showValidationError: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 max-w-[640px]">
      {showValidationError && (
        <div className="bg-[#ffeeed] border border-[#b82626] rounded-md px-4 py-3 text-[13px] text-[#b82626] font-medium">
          Por favor complete todos los campos requeridos
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setDecision('approve')}
          className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-left transition-colors ${
            decision === 'approve'
              ? 'border-[#0f8f64] bg-[#f0faf6]'
              : 'border-convision-border-subtle bg-white hover:border-[#0f8f64]/40'
          }`}
        >
          <CheckCircle
            className={`size-6 ${decision === 'approve' ? 'text-[#0f8f64]' : 'text-gray-300'}`}
          />
          <span className="text-[14px] font-semibold text-convision-text">Aprobar orden</span>
          <span className="text-[12px] text-convision-text-secondary">
            Los lentes cumplen con los estándares de calidad
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDecision('return')}
          className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-left transition-colors ${
            decision === 'return'
              ? 'border-[#b82626] bg-[#fff5f5]'
              : 'border-convision-border-subtle bg-white hover:border-[#b82626]/40'
          }`}
        >
          <XCircle
            className={`size-6 ${decision === 'return' ? 'text-[#b82626]' : 'text-gray-300'}`}
          />
          <span className="text-[14px] font-semibold text-convision-text">
            Retornar al laboratorio
          </span>
          <span className="text-[12px] text-convision-text-secondary">
            Los lentes presentan defectos y deben ser rehechos
          </span>
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-convision-text">
          Observaciones <span className="text-[#b82626]">*</span>
        </label>
        <Textarea
          placeholder="Describa el resultado de la revisión de calidad..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={4}
          className={showValidationError && !observations.trim() ? 'border-[#b82626]' : ''}
        />
        {showValidationError && !observations.trim() && (
          <span className="text-[12px] text-[#b82626]">Las observaciones son requeridas</span>
        )}
      </div>
      <Button
        disabled={!decision}
        onClick={onConfirm}
        className="w-full bg-[#0f8f64] hover:bg-[#0a7050] text-white"
      >
        Confirmar decisión
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

const QualityReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [decision, setDecision] = useState<'approve' | 'return' | null>(null);
  const [observations, setObservations] = useState('');
  const [returnObservations, setReturnObservations] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [defectType, setDefectType] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['laboratory-order', id],
    queryFn: () => laboratoryOrderService.getLaboratoryOrder(Number(id)),
    enabled: !!id,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes: string }) =>
      laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), { status, notes }),
    onSuccess: (_, variables) => {
      const action = variables.status === 'ready_for_delivery' ? 'approved' : 'returned';
      navigate(`/specialist/laboratory-orders?action=${action}`);
    },
    onError: () => {
      toast({ title: 'Error al actualizar el estado', variant: 'destructive' });
    },
  });

  const handleConfirm = () => {
    if (!observations.trim()) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    if (decision === 'approve') {
      setShowApproveModal(true);
    } else if (decision === 'return') {
      setReturnObservations('');
      setShowReturnModal(true);
    }
  };

  const handleApproveConfirm = () => {
    mutation.mutate({
      status: 'ready_for_delivery',
      notes: observations,
    });
  };

  const handleReturnConfirm = () => {
    mutation.mutate({
      status: 'sent_to_lab',
      notes: `[${defectType}] ${returnObservations}`,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-convision-border flex items-center gap-3 px-6 h-[56px] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-[13px] text-convision-text-secondary hover:text-convision-text gap-1.5 -ml-2"
          onClick={() => navigate('/specialist/laboratory-orders')}
        >
          <ArrowLeft className="size-4" />
          Volver a órdenes
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[800px] mx-auto w-full space-y-5">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !order ? (
            <p className="text-[13px] text-convision-text-secondary">Orden no encontrada.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-[20px] font-semibold text-convision-text">
                  Orden #{order.order_number}
                </h1>
                <StatusBadge status={order.status} />
              </div>
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Datos del lente</TabsTrigger>
                  <TabsTrigger value="decision">Decisión de calidad</TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <OrderInfoCard order={order} />
                  <StatusHistoryList order={order} />
                </TabsContent>
                <TabsContent value="decision">
                  <DecisionPanel
                    orderId={order.id}
                    decision={decision}
                    setDecision={setDecision}
                    observations={observations}
                    setObservations={setObservations}
                    showValidationError={showValidationError}
                    onConfirm={handleConfirm}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
      <ApproveModal
        open={showApproveModal}
        isPending={mutation.isPending}
        notifyPatient={notifyPatient}
        onNotifyPatientChange={setNotifyPatient}
        onCancel={() => setShowApproveModal(false)}
        onConfirm={handleApproveConfirm}
      />
      <ReturnModal
        open={showReturnModal}
        isPending={mutation.isPending}
        defectType={defectType}
        observations={returnObservations}
        onDefectTypeChange={setDefectType}
        onObservationsChange={setReturnObservations}
        onCancel={() => setShowReturnModal(false)}
        onConfirm={handleReturnConfirm}
      />
    </div>
  );
};

export default QualityReviewDetail;
