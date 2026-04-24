import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';

export interface PaymentFormState {
  paymentMethod: string;
  amount: string;
  check1: boolean;
  check2: boolean;
}

interface DeliveryPaymentTabProps {
  order: LaboratoryOrder;
  state: PaymentFormState;
  onChange: (patch: Partial<PaymentFormState>) => void;
  errors: Partial<Record<keyof PaymentFormState, string>>;
}

const DeliveryPaymentTab: React.FC<DeliveryPaymentTabProps> = ({
  order,
  state,
  onChange,
  errors,
}) => {
  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';

  const drawerDisplay = order.drawer_number ? `Cajón #${order.drawer_number} — Sede Principal` : '—';

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Resumen de la orden
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5"># Orden</p>
            <p className="font-medium">{order.order_number}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Cajón asignado</p>
            <p className="font-medium">{drawerDisplay}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Paciente</p>
            <p className="font-medium">{patientName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Teléfono del paciente</p>
            <p className="font-medium">{order.patient?.phone ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-[#b57218] bg-[#fff6e3] px-4 py-3 space-y-0.5">
        <p className="text-xs text-[#b57218] font-medium">Saldo pendiente de pago:</p>
        <p className="text-xl font-bold text-[#7a4a0b]">$0</p>
        <p className="text-xs text-[#b57218]">Sin saldo pendiente registrado para esta orden</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Registrar pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Forma de pago <span className="text-red-500">*</span>
            </label>
            <Select
              value={state.paymentMethod}
              onValueChange={(v) => onChange({ paymentMethod: v })}
            >
              <SelectTrigger className="w-full max-w-[350px]">
                <SelectValue placeholder="Seleccione forma de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia bancaria">Transferencia bancaria</SelectItem>
                <SelectItem value="Tarjeta débito">Tarjeta débito</SelectItem>
                <SelectItem value="Tarjeta crédito">Tarjeta crédito</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-xs text-red-500">{errors.paymentMethod}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Valor recibido <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="w-full max-w-[350px]"
              value={state.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2">
              <Checkbox
                id="pay_check1"
                checked={state.check1}
                onCheckedChange={(v) => onChange({ check1: Boolean(v) })}
                className="mt-0.5"
              />
              <label htmlFor="pay_check1" className="text-sm cursor-pointer leading-snug">
                Confirmo que verifiqué la identidad del cliente y el pago fue recibido.
              </label>
            </div>
            {errors.check1 && <p className="text-xs text-red-500 ml-6">{errors.check1}</p>}

            <div className="flex items-start gap-2">
              <Checkbox
                id="pay_check2"
                checked={state.check2}
                onCheckedChange={(v) => onChange({ check2: Boolean(v) })}
                className="mt-0.5"
              />
              <label htmlFor="pay_check2" className="text-sm cursor-pointer leading-snug">
                El pago cubre el saldo total. La orden puede ser cerrada.
              </label>
            </div>
            {errors.check2 && <p className="text-xs text-red-500 ml-6">{errors.check2}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryPaymentTab;
