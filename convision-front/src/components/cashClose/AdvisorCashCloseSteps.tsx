import React from 'react';
import type { CashCloseStepIndex } from '@/components/cashClose/CashCloseStepper';
import AdvisorCashCloseDataStep from '@/components/cashClose/advisor/AdvisorCashCloseDataStep';
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
  advisorNotes: string;
  onAdvisorNotesChange: (value: string) => void;
}

const AdvisorCashCloseSteps: React.FC<Props> = (props) => {
  if (props.step === 0) {
    return (
      <AdvisorCashCloseDataStep
        paymentMethods={props.paymentMethods}
        denominations={props.denominations}
        handlePaymentChange={props.handlePaymentChange}
        handleDenominationChange={props.handleDenominationChange}
        isReadOnly={props.isReadOnly}
        totalCounted={props.totalCounted}
        totalCashCounted={props.totalCashCounted}
        advisorNotes={props.advisorNotes}
        onAdvisorNotesChange={props.onAdvisorNotesChange}
      />
    );
  }
  const paymentMethodsForReview = props.paymentMethods.map((m) =>
    m.name === 'efectivo' ? { ...m, counted_amount: props.totalCashCounted } : m
  );
  return (
    <AdvisorCashCloseReviewPanel
      paymentMethods={paymentMethodsForReview}
      totalCounted={props.totalCounted}
      totalCashCounted={props.totalCashCounted}
      currentStatus={props.currentStatus}
      advisorNotes={props.advisorNotes}
    />
  );
};

export default AdvisorCashCloseSteps;
