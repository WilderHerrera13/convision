import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CASH_CLOSE_STEPS = [
  { title: 'Datos del cierre', subtitle: 'Efectivo, medios de pago y observaciones' },
  { title: 'Resumen', subtitle: 'Confirmar y enviar' },
] as const;

export type CashCloseStepIndex = 0 | 1;

interface Props {
  activeStep: CashCloseStepIndex;
  className?: string;
}

const CashCloseStepper: React.FC<Props> = ({ activeStep, className }) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-4 sm:px-8',
        className
      )}
    >
      <div className="flex w-full items-start">
        {CASH_CLOSE_STEPS.map((step, index) => {
          const isComplete = index < activeStep;
          const isCurrent = index === activeStep;
          const isLast = index === CASH_CLOSE_STEPS.length - 1;
          const segmentComplete = index < activeStep;

          return (
            <React.Fragment key={step.title}>
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors sm:h-11 sm:w-11',
                    isComplete && 'border-[#228b52] bg-[#228b52] text-white',
                    isCurrent &&
                      !isComplete &&
                      'border-[#3a71f7] bg-[#3a71f7] text-white shadow-[0_0_0_4px_rgba(58,113,247,0.15)]',
                    !isComplete &&
                      !isCurrent &&
                      'border-[#dcdce0] bg-white text-[#b0b0bc]'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-2 max-w-[120px] text-[11px] font-semibold leading-tight sm:max-w-[140px] sm:text-[13px]',
                    isComplete && 'text-[#228b52]',
                    isCurrent && !isComplete && 'text-foreground',
                    !isComplete && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    'mt-0.5 hidden max-w-[140px] text-[11px] sm:block',
                    isCurrent && !isComplete && 'text-[#3a71f7]',
                    (!isCurrent || isComplete) && 'text-[#b0b0bc]'
                  )}
                >
                  {step.subtitle}
                </p>
              </div>

              {!isLast && (
                <div
                  className="flex min-h-[44px] min-w-[24px] flex-1 items-center px-1 pt-0 sm:min-w-[48px] sm:px-2"
                  aria-hidden
                >
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-colors',
                      segmentComplete ? 'bg-[#228b52]' : 'bg-[#dcdce0]'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CashCloseStepper;
