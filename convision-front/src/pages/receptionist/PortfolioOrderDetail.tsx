import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, MessageSquare, Mail, MessageCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageLayout from '@/components/layouts/PageLayout';
import { portfolioService, LaboratoryOrderCall } from '@/services/portfolioService';
import RegisterCallModal from '@/components/portfolio/RegisterCallModal';
import { cn } from '@/lib/utils';

const CALL_RESULT_LABELS: Record<string, string> = {
  contacted: 'Contactado — viene a recoger',
  payment_promise: 'Promesa de pago',
  no_answer: 'No contestó',
  wrong_number: 'Número incorrecto',
};

const CALL_RESULT_VARIANT: Record<string, string> = {
  contacted: 'bg-[#ebf5ef] text-[#228b52]',
  payment_promise: 'bg-[#f0f4ff] text-[#3a71f7]',
  no_answer: 'bg-[#fff6e3] text-[#b57218]',
  wrong_number: 'bg-[#ffeeed] text-[#b82626]',
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  call: <Phone className="size-3.5" />,
  whatsapp: <MessageSquare className="size-3.5" />,
  sms: <MessageCircle className="size-3.5" />,
  email: <Mail className="size-3.5" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Correo',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrencyCOP(value: number | null | undefined) {
  if (value == null) return '—';
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

interface CallTimelineProps {
  calls: LaboratoryOrderCall[];
}

const CallTimeline: React.FC<CallTimelineProps> = ({ calls }) => {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[#b4b5bc]">
        <Phone className="size-8 mb-2 opacity-40" />
        <p className="text-[13px]">Sin intentos de contacto registrados</p>
      </div>
    );
  }

  const sorted = [...calls].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="flex flex-col">
      <div className="flex gap-3 mb-3 pb-2 border-b border-[#f0f0f2]">
        <div className="w-2.5 shrink-0" />
        <div className="grid grid-cols-[160px_1fr_120px_120px] gap-x-4 flex-1">
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Fecha</p>
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Resultado</p>
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Canal</p>
          <p className="text-[11px] font-semibold text-[#7d7d87] uppercase tracking-wide">Próximo contacto</p>
        </div>
      </div>

      {sorted.map((call, index) => {
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;
        return (
          <div key={call.id} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn('size-2.5 rounded-full mt-1.5 shrink-0', isFirst ? 'bg-[#8753ef]' : 'bg-[#d1d1d6]')} />
              {!isLast && <div className="w-0.5 bg-[#e5e5e9] flex-1 my-1 min-h-[36px]" />}
            </div>

            <div className={cn('flex-1 grid grid-cols-[160px_1fr_120px_120px] gap-x-4 items-start', isLast ? 'pb-0' : 'pb-5')}>
              <div>
                <p className="text-[12px] text-[#7d7d87] leading-[1.6]">{formatDateTime(call.created_at)}</p>
                <p className="text-[11px] text-[#b4b5bc]">
                  {call.user?.name ?? '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', CALL_RESULT_VARIANT[call.result] ?? 'bg-gray-100 text-gray-600')}>
                  {CALL_RESULT_LABELS[call.result] ?? call.result}
                </span>
                {call.notes && (
                  <p className="text-[12px] text-[#7d7d87] leading-[1.4]">{call.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
                {CHANNEL_ICON[call.channel]}
                <span>{CHANNEL_LABELS[call.channel] ?? call.channel}</span>
              </div>
              <div>
                {call.next_contact_date ? (
                  <div className="flex items-center gap-1 text-[12px] text-[#3a71f7]">
                    <Calendar className="size-3" />
                    <span>{formatDate(call.next_contact_date)}</span>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#b4b5bc]">—</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface PortfolioOrderDetailProps {
  basePath?: string;
}

const PortfolioOrderDetail: React.FC<PortfolioOrderDetailProps> = ({
  basePath = '/receptionist/portfolio',
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [registerOpen, setRegisterOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['portfolio-order', id],
    queryFn: () => portfolioService.getOrder(Number(id)),
    enabled: !!id,
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['portfolio-order-calls', id],
    queryFn: () => portfolioService.getOrderCalls(Number(id)),
    enabled: !!id,
  });

  const patientName = order?.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';

  const handleCallSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio-order', id] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-order-calls', id] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-orders'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-stats'] });
  };

  return (
    <PageLayout
      title={isLoading ? 'Cargando...' : `Orden ${order?.order_number ?? ''}`}
      subtitle="Gestión de Cartera / Detalle de orden"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1.5"
            onClick={() => navigate(basePath)}
          >
            <ArrowLeft className="size-3.5" />
            Volver
          </Button>
          {order && (
            <Button
              size="sm"
              className="h-8 text-[12px] bg-[#8753ef] hover:bg-[#7642d8] text-white gap-1.5"
              onClick={() => setRegisterOpen(true)}
            >
              <Phone className="size-3.5" />
              Registrar llamada
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[#b4b5bc] text-sm">
          Cargando...
        </div>
      ) : !order ? (
        <div className="flex items-center justify-center py-16 text-[#b4b5bc] text-sm">
          Orden no encontrada.
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="border-b border-[#f0f0f2] px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-[#121215]">
                      Historial de seguimiento
                    </p>
                    <p className="text-[12px] text-[#7d7d87] mt-0.5">
                      {calls.length} {calls.length === 1 ? 'intento registrado' : 'intentos registrados'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-[12px] bg-[#8753ef] hover:bg-[#7642d8] text-white gap-1.5"
                    onClick={() => setRegisterOpen(true)}
                  >
                    <Phone className="size-3.5" />
                    Registrar llamada
                  </Button>
                </div>
                <div className="p-6">
                  {callsLoading ? (
                    <div className="py-8 text-center text-[#b4b5bc] text-sm">Cargando historial...</div>
                  ) : (
                    <CallTimeline calls={calls} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-[280px] shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <p className="text-[14px] font-semibold text-[#121215] mb-3">Paciente</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-full bg-[#f1edff] flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-semibold text-[#8753ef]">
                      {patientName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#121215]">{patientName}</p>
                    <p className="text-[12px] text-[#7d7d87]">{order.patient?.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {order.patient?.email && (
                    <div>
                      <p className="text-[11px] text-[#7d7d87]">Correo</p>
                      <p className="text-[12px] text-[#121215] mt-0.5 break-all">{order.patient.email}</p>
                    </div>
                  )}
                  {order.patient?.identification && (
                    <div>
                      <p className="text-[11px] text-[#7d7d87]">Identificación</p>
                      <p className="text-[12px] text-[#121215] mt-0.5">{order.patient.identification}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <p className="text-[14px] font-semibold text-[#121215] mb-3">Detalle de cartera</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">Estado</p>
                    <Badge variant="destructive" className="text-[10px]">Cartera</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">Días en espera</p>
                    <span className={cn('text-[12px] font-semibold', order.days_in_portfolio > 7 ? 'text-[#b82626]' : order.days_in_portfolio > 3 ? 'text-[#b57218]' : 'text-[#228b52]')}>
                      {order.days_in_portfolio} días
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">Cajón asignado</p>
                    <p className="text-[12px] font-medium text-[#121215]">
                      {order.drawer_number ? `#${order.drawer_number}` : '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">Saldo pendiente</p>
                    <p className="text-[12px] font-semibold text-[#121215]">
                      {formatCurrencyCOP(order.balance)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">Intentos de contacto</p>
                    <p className="text-[12px] font-medium text-[#121215]">{order.call_count}</p>
                  </div>
                  {order.sale && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-[#7d7d87]">Venta asociada</p>
                      <p className="text-[12px] font-medium text-[#121215]">{order.sale.sale_number}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#7d7d87]">En cartera desde</p>
                    <p className="text-[12px] text-[#121215]">{formatDate(order.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.laboratory && (
              <Card>
                <CardContent className="pt-5 pb-5 px-5">
                  <p className="text-[14px] font-semibold text-[#121215] mb-3">Laboratorio</p>
                  <p className="text-[13px] font-medium text-[#121215]">{order.laboratory.name}</p>
                </CardContent>
              </Card>
            )}

            {order.last_call && (
              <div className="rounded-lg border border-[#c7d7ff] bg-[#f0f4ff] px-4 py-4">
                <p className="text-[13px] font-semibold text-[#3a71f7]">Último contacto</p>
                <p className="text-[12px] text-[#3a71f7] mt-1.5">
                  {CALL_RESULT_LABELS[order.last_call.result] ?? order.last_call.result}
                </p>
                <p className="text-[11px] text-[#3a71f7] mt-1 opacity-80">
                  {formatDateTime(order.last_call.created_at)}
                </p>
                {order.last_call.next_contact_date && (
                  <p className="text-[11px] text-[#3a71f7] mt-1 flex items-center gap-1">
                    <Calendar className="size-3" />
                    Próximo: {formatDate(order.last_call.next_contact_date)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {order && registerOpen && (
        <RegisterCallModal
          order={order}
          onClose={() => setRegisterOpen(false)}
          onSuccess={handleCallSuccess}
        />
      )}
    </PageLayout>
  );
};

export default PortfolioOrderDetail;
