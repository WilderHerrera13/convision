import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Phone, MessageSquare, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  portfolioService,
  RegisterCallRequest,
  PortfolioOrderItem,
} from '@/services/portfolioService';
import { DatePicker } from '@/components/ui/date-picker';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { cn } from '@/lib/utils';

interface Props {
  order: PortfolioOrderItem;
  onClose: () => void;
  onSuccess?: () => void;
}

type CallResult = RegisterCallRequest['result'];
type CallChannel = RegisterCallRequest['channel'];

interface ResultOption {
  value: CallResult;
  label: string;
  description: string;
}

interface ChannelOption {
  value: CallChannel;
  label: string;
  icon: React.ReactNode;
}

const RESULT_OPTIONS: ResultOption[] = [
  { value: 'contacted', label: 'Contactado — viene a recoger', description: 'El cliente confirmó que recogerá pronto' },
  { value: 'payment_promise', label: 'Promesa de pago', description: 'El cliente prometió pagar en una fecha específica' },
  { value: 'no_answer', label: 'No contestó', description: 'Llamada sin respuesta o buzón de voz' },
  { value: 'wrong_number', label: 'Número incorrecto / equivocado', description: 'El número no corresponde al cliente' },
];

const CHANNEL_OPTIONS: ChannelOption[] = [
  { value: 'call', label: 'Llamada', icon: <Phone className="size-3" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="size-3" /> },
  { value: 'sms', label: 'SMS', icon: <MessageCircle className="size-3" /> },
  { value: 'email', label: 'Correo', icon: <Mail className="size-3" /> },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const RegisterCallModal: React.FC<Props> = ({ order, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const roleTheme = useRoleTheme();
  const [result, setResult] = useState<CallResult | null>(null);
  const [channel, setChannel] = useState<CallChannel>('call');
  const [nextContactDate, setNextContactDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : 'Paciente';
  const initials = getInitials(patientName);
  const phone = order.patient?.phone ?? '—';

  const mutation = useMutation({
    mutationFn: (data: RegisterCallRequest) =>
      portfolioService.registerCall(order.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-stats'] });
      toast({ title: 'Llamada registrada', description: 'El seguimiento fue guardado correctamente.' });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo registrar la llamada.', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!result) {
      toast({ title: 'Campo requerido', description: 'Selecciona el resultado de la llamada.', variant: 'destructive' });
      return;
    }
    mutation.mutate({
      result,
      channel,
      next_contact_date: nextContactDate ? nextContactDate.toISOString().split('T')[0] : null,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[520px] mx-4 overflow-hidden">
        <div className="bg-white border-b border-[#ebebee] h-[68px] flex flex-col justify-center px-6 shrink-0">
          <p className="text-[16px] font-semibold text-[#0f0f12]">Registrar llamada de seguimiento</p>
          <p className="text-[12px] text-[#7d7d87]">
            Orden {order.order_number} · {patientName}
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-[#f5f5f6] rounded-md hover:bg-[#ebebee] transition-colors"
          >
            <X className="size-4 text-[#7d7d87]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="bg-[#f9f9fb] border border-[#e5e5e9] rounded-lg px-4 py-3 flex items-start gap-3">
            <div className="size-9 rounded-full flex items-center justify-center shrink-0" style={{ background: roleTheme.light }}>
              <span className="text-[13px] font-semibold leading-none" style={{ color: roleTheme.primary }}>{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#0f0f12]">{patientName}</p>
              <p className="text-[12px] text-[#7d7d87]">{phone}</p>
              <p className="text-[11px] text-[#b4b5bc] mt-0.5">
                {order.days_in_portfolio} días en espera
                {order.drawer_number ? ` · Cajón ${order.drawer_number}` : ''}
                {order.call_count > 0 ? ` · ${order.call_count} intento${order.call_count !== 1 ? 's' : ''} previo${order.call_count !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            {order.days_in_portfolio > 7 && (
              <span className="ml-auto shrink-0 px-2 py-0.5 bg-[#ffeeed] text-[#b82626] text-[10px] font-semibold rounded-full">
                Urgente
              </span>
            )}
          </div>

          <div className="w-full h-px bg-[#f0f0f2]" />

          <div>
            <p className="text-[13px] font-semibold text-[#0f0f12] mb-1">Resultado de la llamada *</p>
            <p className="text-[12px] text-[#7d7d87] mb-3">¿Qué ocurrió en esta llamada?</p>
            <div className="space-y-2">
              {RESULT_OPTIONS.map((opt) => {
                const isSelected = result === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResult(opt.value)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all',
                      isSelected ? 'border-2' : 'border border-[#e5e5e9] bg-white hover:border-[#d0d0d8]',
                    )}
                    style={isSelected ? { borderColor: roleTheme.primary, background: roleTheme.light } : undefined}
                  >
                    <div
                      className="size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                      style={isSelected ? { borderColor: roleTheme.primary } : { borderColor: '#d1d1d6' }}
                    >
                      {isSelected && <div className="size-2 rounded-full" style={{ background: roleTheme.primary }} />}
                    </div>
                    <div>
                      <p
                        className="text-[13px] font-semibold leading-none"
                        style={isSelected ? { color: roleTheme.primary } : { color: '#0f0f12' }}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-[#7d7d87] mt-1">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#0f0f12] mb-2">Canal usado *</p>
            <div className="flex items-center gap-2 flex-wrap">
              {CHANNEL_OPTIONS.map((ch) => {
                const isSelected = channel === ch.value;
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setChannel(ch.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all',
                      isSelected ? 'border-2' : 'border border-[#e0e0e4] bg-white text-[#0f0f12] hover:border-[#c0c0c8]',
                    )}
                    style={isSelected ? { borderColor: roleTheme.primary, background: roleTheme.light, color: roleTheme.primary } : undefined}
                  >
                    {ch.icon}
                    {ch.label}
                  </button>
                );
              })}
            </div>
            {(channel === 'whatsapp' || channel === 'sms') && (
              <p className="text-[11px] text-[#7d7d87] mt-2">
                Si seleccionas WhatsApp o SMS, se enviará una plantilla preaprobada al cliente.
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium text-[#0f0f12] mb-2">Fecha del próximo intento de contacto *</p>
            <DatePicker
              value={nextContactDate}
              onChange={setNextContactDate}
              className="w-[200px]"
            />
          </div>

          <div className="w-full h-px bg-[#f0f0f2]" />

          <div>
            <p className="text-[11px] font-medium text-[#0f0f12] mb-2">Notas de la llamada</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Ej. "Cliente dice que viene el viernes en la tarde..."'
              rows={3}
              className="w-full border border-[#e5e5e9] rounded-md px-3 py-2 text-[12px] text-[#0f0f12] placeholder:text-[#b4b5bc] resize-none focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': roleTheme.primary } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="bg-white border-t border-[#ebebee] h-[68px] flex items-center justify-end gap-3 px-6 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-[13px]"
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="h-9 px-4 text-[13px] text-white"
            style={{ background: roleTheme.primary }}
            disabled={mutation.isPending || !result}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar llamada'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegisterCallModal;
