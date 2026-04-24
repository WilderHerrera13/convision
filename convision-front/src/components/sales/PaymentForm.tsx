import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  requires_reference: boolean;
}

interface PaymentFormProps {
  paymentMethods: PaymentMethod[];
  selectedPaymentMethodId: number;
  paymentReference: string;
  customerNote: string;
  isPartialPayment: boolean;
  paymentAmount: string;
  onPaymentMethodChange: (id: number) => void;
  onReferenceChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onPartialPaymentChange: (checked: boolean) => void;
  onPaymentAmountChange: (value: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentMethods,
  selectedPaymentMethodId,
  paymentReference,
  customerNote,
  isPartialPayment,
  paymentAmount,
  onPaymentMethodChange,
  onReferenceChange,
  onNoteChange,
  onPartialPaymentChange,
  onPaymentAmountChange,
}) => {
  const selectedMethod = paymentMethods.find((m) => m.id === selectedPaymentMethodId);

  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
      <div className="bg-[#f7f4ff] border-b border-[#e5e5e9] h-[44px] flex items-center px-4">
        <span className="text-[13px] font-semibold text-[#121212]">Forma de Pago</span>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-[#121212]">Método de Pago *</label>
          <Select
            value={selectedPaymentMethodId.toString()}
            onValueChange={(v) => onPaymentMethodChange(parseInt(v))}
          >
            <SelectTrigger className="h-[36px] border-[#e5e5e9] text-[13px]">
              <SelectValue placeholder="Seleccionar método de pago" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id.toString()}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-[#121212]">Referencia</label>
          <Input
            className="h-[36px] border-[#e5e5e9] text-[13px]"
            placeholder="Número de recibo o referencia..."
            value={paymentReference}
            onChange={(e) => onReferenceChange(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-[#121212]">Observaciones</label>
          <Textarea
            className="border-[#e5e5e9] text-[13px] resize-none"
            placeholder="Observaciones o notas adicionales..."
            rows={3}
            value={customerNote}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="partial-payment"
            checked={isPartialPayment}
            onCheckedChange={(checked) => {
              onPartialPaymentChange(checked as boolean);
              if (!checked) onPaymentAmountChange('');
            }}
          />
          <Label htmlFor="partial-payment" className="text-[12px] text-[#121212] cursor-pointer">
            Realizar un abono (pago parcial)
          </Label>
        </div>

        {isPartialPayment && (
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-[#121212]">Monto a abonar</label>
            <Input
              type="number"
              className="h-[36px] border-[#e5e5e9] text-[13px]"
              placeholder="Monto del abono"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentForm;
