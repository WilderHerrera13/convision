import React from 'react';
import type { CashCloseStepIndex } from '@/components/cashClose/CashCloseStepper';
import AdvisorCashClosePaymentsPanel from '@/components/cashClose/advisor/AdvisorCashClosePaymentsPanel';
import AdvisorCashCloseCashPanel from '@/components/cashClose/advisor/AdvisorCashCloseCashPanel';
import AdvisorCashCloseReviewPanel from '@/components/cashClose/advisor/AdvisorCashCloseReviewPanel';
import type { PaymentMethodState, DenominationState } from '@/hooks/useCashClose';

interface Props {
  step: CashCloseStepIndex;
  paymentMethods: PaymentMethodState[];
  denominations: DenominationState[];
  handlePaymentChange: (name: string, value: number) => void;
  handleDenominationChange: (denomination: number, quantity: number) => void;
  isReadOnly: boolean;
  totalCounted: number;
  totalCashCounted: number;
  currentStatus: string;
}

const AdvisorCashCloseSteps: React.FC<Props> = (props) => {
  if (props.step === 0) {
    return (
      <AdvisorCashClosePaymentsPanel
        paymentMethods={props.paymentMethods}
        handlePaymentChange={props.handlePaymentChange}
        isReadOnly={props.isReadOnly}
        totalCounted={props.totalCounted}
      />
    );
  }
  if (props.step === 1) {
    const efectivoRegistrado =
      props.paymentMethods.find((pm) => pm.name === 'efectivo')?.counted_amount ?? 0;
    return (
      <AdvisorCashCloseCashPanel
        denominations={props.denominations}
        handleDenominationChange={props.handleDenominationChange}
        isReadOnly={props.isReadOnly}
        totalCashCounted={props.totalCashCounted}
        efectivoRegistrado={efectivoRegistrado}
      />
    );
  }
  return (
    <AdvisorCashCloseReviewPanel
      paymentMethods={props.paymentMethods}
      totalCounted={props.totalCounted}
      totalCashCounted={props.totalCashCounted}
      currentStatus={props.currentStatus}
    />
  );
};

export default AdvisorCashCloseSteps;
