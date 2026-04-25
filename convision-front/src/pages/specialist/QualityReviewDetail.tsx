import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import ApproveModal from '@/components/quality-review/ApproveModal';
import ReturnModal from '@/components/quality-review/ReturnModal';
import {
  LABORATORY_ORDER_STATUS_LABELS,
  LAB_ORDER_STATUS_TOKENS,
} from '@/constants/laboratoryOrderStatus';

const QUALITY_STATUS_LABEL: Record<string, string> = {
  in_quality: 'En revisión',
  ready_for_delivery: 'Listo para entrega',
  sent_to_lab: 'En laboratorio',
  pending: 'Pendiente',
  received_from_lab: 'Listo del lab.',
  ...LABORATORY_ORDER_STATUS_LABELS,
};

function StatusBadge({ status }: { status: string }) {
  const token = LAB_ORDER_STATUS_TOKENS[status as keyof typeof LAB_ORDER_STATUS_TOKENS];
  const bg = token?.bg ?? '#f1f2f6';
  const text = token?.text ?? '#374151';
  const label = QUALITY_STATUS_LABEL[status] ?? status;
  if (status === 'in_quality') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fff6e3] text-[#b57218]">{label}</span>
  );
  if (status === 'ready_for_delivery') return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ebf5ef] text-[#0f8f64]">{label}</span>
  );
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-[#7d7d87]">{label}</span>
      <span className="text-[13px] font-semibold text-[#121215]">{value}</span>
    </div>
  );
}

function HistorialCard({ order }: { order: LaboratoryOrder }) {
  const history = order.statusHistory ?? [];
  return (
    <div className="bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
      <div className="bg-[#f8f9fb] border-b border-[#ebebee] px-4 py-3 flex items-center gap-2">
        <Info className="size-4 text-[#7d7d87] shrink-0" />
        <span className="text-[13px] font-semibold text-[#121215]">Historial de esta orden</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        {history.length === 0 ? (
          <p className="text-[12px] text-[#7d7d87]">Sin historial disponible.</p>
        ) : (
          history.slice(-4).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#7d7d87] flex-1 truncate">
                {new Date(entry.created_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                })}{' '}
                {entry.user ? `· ${entry.user.name}` : ''}
              </span>
              <StatusBadge status={entry.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CriteriosCard() {
  return (
    <div className="bg-[#ebf5ef] border border-[#a6d9bd] rounded-[8px] px-3 py-3">
      <div className="flex items-start gap-2 mb-2">
        <Info className="size-4 text-[#0a6b4a] shrink-0 mt-0.5" />
        <span className="text-[13px] font-semibold text-[#0a6b4a]">Criterios de revisión</span>
      </div>
      <ul className="flex flex-col gap-2 pl-1">
        {[
          'Sin rayaduras ni burbujas en la superficie',
          'Graduación correcta según la fórmula',
          'Tratamientos aplicados (AR, UV, tinte)',
          'Montaje alineado con la montura',
        ].map((item) => (
          <li key={item} className="text-[11px] text-[#1f1f23]">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function RetornoWarningCard() {
  return (
    <div className="bg-[#fff6e3] border border-[#f0cc8a] rounded-[8px] px-3 py-3">
      <div className="flex items-start gap-2 mb-2">
        <TriangleAlert className="size-4 text-[#7a4d10] shrink-0 mt-0.5" />
        <span className="text-[13px] font-semibold text-[#7a4d10]">Al retornar al laboratorio</span>
      </div>
      <p className="text-[11px] text-[#7a4d10] leading-relaxed">
        La orden vuelve a estado "En laboratorio" y se notifica automáticamente al proveedor. El historial registra tu usuario y motivo.
      </p>
    </div>
  );
}

const RETURN_REASONS = [
  'Defecto superficial — raya / burbuja / arco',
  'Graduación incorrecta',
  'Error en tratamiento (AR, UV, tinte)',
  'Distorsión o aberración',
  'Montaje incorrecto',
  'Otro',
];

const CHECKLIST_ITEMS = [
  'Potencia y eje verificados con frontofocómetro',
  'Centrado pupilar correcto en ambos lentes',
  'Montaje y limpieza sin defectos visibles',
  'Tratamientos (AR, fotocromático) aplicados',
  'Estuche y certificado preparados para entrega',
];

function TabDatosLente({
  order,
  observations,
  setObservations,
  returnReason,
  setReturnReason,
  confirmed,
  setConfirmed,
  showValidationError,
  readOnly,
}: {
  order: LaboratoryOrder;
  observations: string;
  setObservations: (v: string) => void;
  returnReason: string;
  setReturnReason: (v: string) => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  showValidationError: boolean;
  readOnly?: boolean;
}) {
  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';
  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const estimatedDate = order.estimated_completion_date
    ? new Date(order.estimated_completion_date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div className="flex flex-col gap-0">
      {showValidationError && (
        <div className="mx-7 mt-5 flex items-center gap-2.5 bg-[#ffeeed] border border-[#b82626] rounded-[8px] px-4 py-3">
          <TriangleAlert className="size-4 text-[#7a1717] shrink-0" />
          <span className="text-[13px] font-semibold text-[#7a1717]">
            Faltan campos obligatorios para confirmar la revisión. Revisa los marcados en rojo.
          </span>
        </div>
      )}

      <div className="px-7 py-5">
        <p className="text-[13px] font-semibold text-[#121215] mb-3">Resumen de la orden</p>
        <div className="h-px bg-[#f0f0f2] mb-4" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
          <InfoRow label="# Orden" value={order.order_number} />
          <InfoRow label="Paciente" value={patientName} />
          <InfoRow label="Laboratorio" value={order.laboratory?.name ?? '—'} />
          <InfoRow label="Fecha de creación" value={createdAt} />
          <InfoRow label="Fecha estimada entrega" value={estimatedDate} />
          <InfoRow label="Prioridad" value={order.priority ?? 'Normal'} />
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-[11px] text-[#7d7d87]">Descripción del lente</span>
          <div className="bg-[#f8f9fb] border border-[#e5e5e9] rounded-[6px] px-3 py-2.5 min-h-[48px]">
            <span className="text-[12px] text-[#121215]">{order.notes ?? '—'}</span>
          </div>
        </div>

        {!readOnly && (
          <>
            <div className="h-px bg-[#f0f0f2] my-4" />

            <p className="text-[13px] font-semibold text-[#121215] mb-3">Notas de la revisión</p>
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-[11px] text-[#7d7d87]">
                Observaciones del especialista <span className="text-[#b82626]">*</span>
              </label>
              <Textarea
                placeholder="Ej. Raya en la capa anti-reflejo zona central OD. Requiere rehacer."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className={`text-[12px] resize-none ${showValidationError && !observations.trim() ? 'border-[#b82626]' : ''}`}
              />
              {showValidationError && !observations.trim() && (
                <span className="text-[12px] font-medium text-[#b82626]">
                  Las observaciones son obligatorias antes de aprobar o retornar.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[11px] text-[#7d7d87]">Motivo de retorno (si aplica)</label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger className={`text-[13px] w-[350px] ${showValidationError && !returnReason ? 'border-[#b82626]' : ''}`}>
                  <SelectValue placeholder="Selecciona el motivo" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-[13px]">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidationError && !returnReason && (
                <span className="text-[12px] font-medium text-[#b82626]">
                  Selecciona el motivo si la decisión es retornar.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="confirm-review"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="border-[#0f8f64] data-[state=checked]:bg-[#0f8f64] data-[state=checked]:border-[#0f8f64]"
              />
              <label htmlFor="confirm-review" className="text-[12px] text-[#121215] cursor-pointer select-none">
                Confirmo que revisé físicamente el lente y esta decisión es final.
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_TO_DECISION: Record<string, 'approve' | 'return' | 'cancel'> = {
  ready_for_delivery: 'approve',
  sent_to_lab: 'return',
  cancelled: 'cancel',
};

function TabDecisionCalidad({
  decision,
  setDecision,
  checklist,
  setChecklist,
  internalNotes,
  setInternalNotes,
  readOnly,
  order,
}: {
  decision: 'approve' | 'return' | 'cancel' | null;
  setDecision: (d: 'approve' | 'return' | 'cancel') => void;
  checklist: boolean[];
  setChecklist: (v: boolean[]) => void;
  internalNotes: string;
  setInternalNotes: (v: string) => void;
  readOnly?: boolean;
  order?: LaboratoryOrder;
}) {
  const resolvedDecision = readOnly && order ? (STATUS_TO_DECISION[order.status] ?? null) : decision;

  const lastHistoryNote = readOnly && order
    ? order.statusHistory?.slice().reverse().find(
        (h) => h.status === order.status || STATUS_TO_DECISION[h.status] != null
      )?.notes ?? null
    : null;

  const radioCards = [
    { key: 'approve' as const, title: 'Aprobada', desc: 'Cumple parámetros — lista para entrega' },
    { key: 'return' as const, title: 'Retornar al laboratorio', desc: 'Defecto de fabricación o material' },
    { key: 'cancel' as const, title: 'Cancelar orden', desc: 'No es viable continuar la fabricación' },
  ];

  return (
    <div className="px-7 py-5 flex flex-col gap-5">
      <div>
        <p className="text-[15px] font-semibold text-[#13131a] mb-1">Decisión de calidad</p>
        <p className="text-[13px] text-[#7d7d87]">
          {readOnly
            ? 'Decisión registrada por el especialista para esta orden.'
            : 'Selecciona el resultado de tu inspección. Esta acción cambia el estado de la orden.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {radioCards.map(({ key, title, desc }) => {
          const selected = resolvedDecision === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => !readOnly && setDecision(key)}
              className={`flex flex-col gap-2 px-4 py-3.5 rounded-[10px] border-2 text-left transition-colors ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${
                selected
                  ? 'border-[#0f8f64] bg-[#ebf5ef]'
                  : readOnly
                  ? 'border-[#e8e8ee] bg-[#f8f9fb] opacity-50'
                  : 'border-[#d8d8de] bg-white hover:border-[#0f8f64]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`size-4 rounded-full border-2 flex items-center justify-center ${
                    selected ? 'border-[#0f8f64]' : 'border-[#d8d8de]'
                  }`}
                >
                  {selected && <div className="size-2 rounded-full bg-[#0f8f64]" />}
                </div>
                <span className="text-[13px] font-semibold text-[#13131a]">{title}</span>
              </div>
              <span className="text-[12px] text-[#7d7d87]">{desc}</span>
            </button>
          );
        })}
      </div>

      {readOnly && lastHistoryNote && (
        <>
          <div className="h-px bg-[#eeeff2]" />
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-semibold text-[#13131a]">Notas registradas</p>
            <div className="bg-[#f8f9fb] border border-[#e5e5e9] rounded-[6px] px-3 py-2.5 min-h-[48px]">
              <span className="text-[12px] text-[#121215]">{lastHistoryNote}</span>
            </div>
          </div>
        </>
      )}

      {!readOnly && (
        <>
          <div className="h-px bg-[#eeeff2]" />

          <div>
            <p className="text-[14px] font-semibold text-[#13131a] mb-3">Lista de verificación</p>
            <div className="flex flex-col gap-2.5">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`check-${i}`}
                    checked={checklist[i] ?? false}
                    onCheckedChange={(v) => {
                      const next = [...checklist];
                      next[i] = v === true;
                      setChecklist(next);
                    }}
                    className="border-[#d8d8de] data-[state=checked]:bg-[#0f8f64] data-[state=checked]:border-[#0f8f64]"
                  />
                  <label
                    htmlFor={`check-${i}`}
                    className={`text-[13px] cursor-pointer select-none ${checklist[i] ? 'text-[#13131a]' : 'text-[#7d7d87]'}`}
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#eeeff2]" />

          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-semibold text-[#13131a]">Notas internas</p>
            <Textarea
              placeholder="Comentarios para el equipo (no visibles para el paciente)…"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="text-[13px] resize-none border-[#d8d8de]"
            />
          </div>
        </>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-6 px-6 py-5">
      <div className="flex-1 flex flex-col gap-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-[332px] flex flex-col gap-4">
        <Skeleton className="h-[220px] rounded-[8px]" />
        <Skeleton className="h-[180px] rounded-[8px]" />
      </div>
    </div>
  );
}

type ActiveTab = 'details' | 'decision';

const QualityReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [observations, setObservations] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [defectType, setDefectType] = useState('');
  const [returnObservations, setReturnObservations] = useState('');
  const [decision, setDecision] = useState<'approve' | 'return' | 'cancel' | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false));
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'approve') setActiveTab('decision');
    else if (action === 'return') { setActiveTab('decision'); setDecision('return'); }
  }, [searchParams]);

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
      queryClient.invalidateQueries({ queryKey: ['quality-review-orders'] });
      queryClient.removeQueries({ queryKey: ['laboratory-order', id] });
      const action = variables.status === 'ready_for_delivery' ? 'approved' : 'returned';
      navigate(`/specialist/laboratory-orders?action=${action}`);
    },
    onError: () => {
      toast({ title: 'Error al actualizar el estado', variant: 'destructive' });
    },
  });

  const handleApprove = () => {
    if (!observations.trim()) {
      setShowValidationError(true);
      setActiveTab('details');
      return;
    }
    setShowValidationError(false);
    setShowApproveModal(true);
  };

  const handleReturn = () => {
    if (!observations.trim()) {
      setShowValidationError(true);
      setActiveTab('details');
      return;
    }
    setShowValidationError(false);
    setReturnObservations('');
    setDefectType('');
    setShowReturnModal(true);
  };

  const handleApproveConfirm = (comment: string) => {
    mutation.mutate({ status: 'ready_for_delivery', notes: comment || observations });
  };

  const handleReturnConfirm = () => {
    const type = defectType.trim();
    const obs = returnObservations.trim();
    const notes = type && obs ? `[${type}] ${obs}` : type || obs || observations;
    mutation.mutate({ status: 'sent_to_lab', notes });
  };

  const patientName = order?.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '';

  const isReadOnly = !!order && order.status !== 'in_quality';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-[#ebebee] flex items-center justify-between gap-3 px-6 h-[60px] shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
            <span
              className="cursor-pointer hover:text-[#121215]"
              onClick={() => navigate('/specialist/laboratory-orders')}
            >
              Órdenes de Lab.
            </span>
            <span className="text-[#d1d1d8]">/</span>
            <span
              className="cursor-pointer hover:text-[#121215]"
              onClick={() => navigate('/specialist/laboratory-orders')}
            >
              Revisión de Calidad
            </span>
            {order && (
              <>
                <span className="text-[#d1d1d8]">/</span>
                <span className="font-semibold text-[#121215]">#{order.order_number} · Revisión</span>
              </>
            )}
          </div>
          <span className="text-[16px] font-semibold text-[#121215]">
            {order ? `Revisión de Calidad — #${order.order_number}` : 'Revisión de Calidad'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[13px] h-9 border-[#e5e5e9]"
            onClick={() => navigate('/specialist/laboratory-orders')}
          >
            <ArrowLeft className="size-4 mr-1.5" />
            Volver
          </Button>
          {order && isReadOnly ? (
            <StatusBadge status={order.status} />
          ) : (
            <>
              <Button
                size="sm"
                className="bg-[#0f8f64] hover:bg-[#0a7050] text-white text-[13px] h-9"
                onClick={handleApprove}
                disabled={mutation.isPending || isLoading}
              >
                Aprobar · Listo para entrega
              </Button>
              <Button
                size="sm"
                className="bg-[#ffeeed] hover:bg-[#ffdcdc] text-[#b82626] border border-[#f5baba] text-[13px] h-9"
                variant="ghost"
                onClick={handleReturn}
                disabled={mutation.isPending || isLoading}
              >
                Retornar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f6]">
        {isLoading ? (
          <div className="max-w-[1156px] mx-auto px-6 py-5">
            <LoadingSkeleton />
          </div>
        ) : !order ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-[13px] text-[#7d7d87]">Orden no encontrada.</p>
          </div>
        ) : (
          <div className="max-w-[1156px] mx-auto px-6 py-5 flex gap-5 items-start">
            <div className="flex-1 min-w-0 bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
              <div className="bg-[#f8f9fb] border-b border-[#e5e5e9] flex items-center justify-between">
                <div className="flex">
                  {([
                    { key: 'details', label: 'Datos del lente' },
                    { key: 'decision', label: 'Decisión de calidad' },
                  ] as { key: ActiveTab; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`relative px-5 py-3 text-[13px] transition-colors ${
                        activeTab === key
                          ? 'bg-white font-semibold text-[#0f0f12]'
                          : 'font-normal text-[#7d7d87] hover:text-[#0f0f12]'
                      }`}
                    >
                      {label}
                      {activeTab === key && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0f8f64]" />
                      )}
                    </button>
                  ))}
                </div>
                {isReadOnly && (
                  <span className="text-[11px] text-[#7d7d87] px-4 py-2">Solo lectura</span>
                )}
              </div>

              {activeTab === 'details' ? (
                <TabDatosLente
                  order={order}
                  observations={observations}
                  setObservations={setObservations}
                  returnReason={returnReason}
                  setReturnReason={setReturnReason}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                  showValidationError={showValidationError}
                  readOnly={isReadOnly}
                />
              ) : (
                <TabDecisionCalidad
                  decision={decision}
                  setDecision={setDecision}
                  checklist={checklist}
                  setChecklist={setChecklist}
                  internalNotes={internalNotes}
                  setInternalNotes={setInternalNotes}
                  readOnly={isReadOnly}
                  order={order}
                />
              )}
            </div>

            <div className="w-[332px] shrink-0 flex flex-col gap-4">
              <HistorialCard order={order} />
              <CriteriosCard />
              <RetornoWarningCard />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-[#ebebee] h-[64px] flex items-center px-6 shrink-0">
        {isReadOnly ? (
          <p className="text-[12px] text-[#7d7d87]">Esta orden ya fue procesada y no admite más acciones.</p>
        ) : (
          <p className="text-[12px] text-[#7d7d87]">Campos marcados con * son obligatorios</p>
        )}
      </div>

      <ApproveModal
        open={showApproveModal}
        isPending={mutation.isPending}
        orderNumber={order?.order_number ?? ''}
        patientName={patientName}
        laboratoryName={order?.laboratory?.name ?? ''}
        onCancel={() => setShowApproveModal(false)}
        onConfirm={handleApproveConfirm}
      />
      <ReturnModal
        open={showReturnModal}
        isPending={mutation.isPending}
        defectType={defectType}
        observations={returnObservations}
        orderNumber={order?.order_number ?? ''}
        patientName={patientName}
        laboratoryName={order?.laboratory?.name ?? ''}
        onDefectTypeChange={setDefectType}
        onObservationsChange={setReturnObservations}
        onCancel={() => setShowReturnModal(false)}
        onConfirm={handleReturnConfirm}
      />
    </div>
  );
};

export default QualityReviewDetail;
