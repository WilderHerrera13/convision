import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AdvisorCashCloseCashPanel from '@/components/cashClose/advisor/AdvisorCashCloseCashPanel';
import AdvisorCashClosePaymentsPanel from '@/components/cashClose/advisor/AdvisorCashClosePaymentsPanel';
import type { PaymentMethodState, DenominationState } from '@/hooks/useCashClose';

interface Props {
  paymentMethods: PaymentMethodState[];
  denominations: DenominationState[];
  handlePaymentChange: (name: string, value: number) => void;
  handleDenominationChange: (denomination: number, quantity: number) => void;
  isReadOnly: boolean;
  totalCounted: number;
  totalCashCounted: number;
  advisorNotes: string;
  onAdvisorNotesChange: (value: string) => void;
}

const AdvisorCashCloseDataStep: React.FC<Props> = ({
  paymentMethods,
  denominations,
  handlePaymentChange,
  handleDenominationChange,
  isReadOnly,
  totalCounted,
  totalCashCounted,
  advisorNotes,
  onAdvisorNotesChange,
}) => (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          <AdvisorCashCloseCashPanel
            denominations={denominations}
            handleDenominationChange={handleDenominationChange}
            isReadOnly={isReadOnly}
            totalCashCounted={totalCashCounted}
          />
        </div>
        <div className="min-w-0 space-y-4">
          <AdvisorCashClosePaymentsPanel
            paymentMethods={paymentMethods}
            handlePaymentChange={handlePaymentChange}
            isReadOnly={isReadOnly}
            totalCounted={totalCounted}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash-close-advisor-notes" className="text-[13px] font-semibold text-foreground">
          Observaciones
        </Label>
        <Textarea
          id="cash-close-advisor-notes"
          value={advisorNotes}
          onChange={(e) => onAdvisorNotesChange(e.target.value)}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          placeholder="Notas u observaciones sobre el cierre (opcional)…"
          rows={10}
          maxLength={2000}
          className="min-h-[220px] resize-y text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          {advisorNotes.length}/2000 — visible para administración al revisar el cierre.
        </p>
      </div>
    </div>
);

export default AdvisorCashCloseDataStep;
