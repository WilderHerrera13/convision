import React from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Accent = 'receptionist' | 'admin';

const accentMap: Record<Accent, { fill: string; ring: string; line: string; sub: string; glow: string }> = {
  receptionist: {
    fill: 'bg-[#8753ef] text-white border-[#8753ef]',
    ring: 'bg-white text-[#8753ef] border-[#8753ef]',
    line: 'bg-[#8753ef]',
    sub: 'text-[#8753ef]',
    glow: 'shadow-[0_0_0_4px_rgba(135,83,239,0.15)]',
  },
  admin: {
    fill: 'bg-primary text-primary-foreground border-primary',
    ring: 'bg-white text-primary border-primary',
    line: 'bg-primary',
    sub: 'text-primary',
    glow: 'shadow-[0_0_0_4px_hsl(var(--primary)_/_0.15)]',
  },
};

type StepState = 'todo' | 'active' | 'done' | 'skipped';

function StepCircle({
  n,
  state,
  accent,
}: {
  n: number | 'check';
  state: StepState;
  accent: Accent;
}) {
  const a = accentMap[accent];
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors',
        state === 'active' && a.fill,
        state === 'active' && a.glow,
        state === 'done' && a.ring,
        state === 'skipped' && a.ring,
        state === 'todo' && 'border-[#dcdce0] bg-white text-[#b0b0bc]',
      )}
      aria-current={state === 'active' ? 'step' : undefined}
    >
      {n === 'check' ? <Check className="size-5" strokeWidth={2.5} aria-hidden /> : n}
    </div>
  );
}

export type QuickAttentionStepperProps = {
  phase: 1 | 2 | 3;
  profileSkipped: boolean;
  omitProfileStep: boolean;
  middleVariant?: 'profile' | 'amount';
  accent: Accent;
};

const STEPS_3_PROFILE = [
  { title: 'Tipo de atención', sub: 'Elige el ítem' },
  { title: 'Perfil', sub: 'Hombre · Mujer · Niño' },
  { title: 'Observación', sub: 'Nota breve' },
] as const;

const STEPS_3_AMOUNT = [
  { title: 'Tipo de atención', sub: 'Elige el ítem' },
  { title: 'Monto recibido', sub: 'Pesos COP' },
  { title: 'Observación', sub: 'Nota breve' },
] as const;

const STEPS_2 = [
  { title: 'Tipo de atención', sub: 'Elige el ítem' },
  { title: 'Observación', sub: 'Nota breve' },
] as const;

/**
 * Barra de pasos alineada al DS (Figma: StepsBar · Registro atención, nodo 698:245).
 */
const QuickAttentionStepsBar: React.FC<QuickAttentionStepperProps> = ({
  phase,
  profileSkipped,
  omitProfileStep,
  middleVariant = 'profile',
  accent,
}) => {
  const a = accentMap[accent];
  const steps3 = middleVariant === 'amount' ? STEPS_3_AMOUNT : STEPS_3_PROFILE;

  if (omitProfileStep) {
    const s1: StepState = phase === 1 ? 'active' : 'done';
    const s2obs: StepState = phase === 3 ? 'active' : 'todo';
    const lineDone = phase >= 3;
    const activeCol = phase === 1 ? 0 : 1;

    const titleClass2 = (i: 0 | 1) =>
      cn(
        'mt-2 max-w-[180px] text-[13px] leading-tight',
        activeCol === i ? 'font-semibold text-[#0f0f12]' : 'font-normal text-[#7d7d87]',
      );
    const subClass2 = (i: 0 | 1) =>
      cn('mt-0.5 text-[11px] leading-tight', activeCol === i ? a.sub : 'text-[#b0b0bc]');

    return (
      <Card className="rounded-lg border-[#e5e5e9] bg-white shadow-none">
        <div className="flex w-full items-start px-3 pb-4 pt-3 sm:px-6">
          {STEPS_2.map((step, index) => {
            const i = index as 0 | 1;
            const isLast = index === STEPS_2.length - 1;
            const circleState = i === 0 ? s1 : s2obs;
            const n = i === 0 ? 1 : 2;

            return (
              <React.Fragment key={step.title}>
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <StepCircle n={n} state={circleState} accent={accent} />
                  <p className={titleClass2(i)}>{step.title}</p>
                  <p className={subClass2(i)}>{step.sub}</p>
                </div>

                {!isLast && (
                  <div
                    className="flex min-h-[44px] min-w-[20px] flex-1 items-center px-0.5 pt-0 sm:min-w-[40px] sm:px-2"
                    aria-hidden
                  >
                    <div
                      className={cn(
                        'h-0.5 w-full rounded-full transition-colors',
                        lineDone ? a.line : 'bg-[#dcdce0]',
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>
    );
  }

  const s1: StepState = phase === 1 ? 'active' : 'done';
  let s2: StepState = 'todo';
  if (phase === 2) s2 = 'active';
  else if (phase === 3 && profileSkipped) s2 = 'skipped';
  else if (phase === 3 && !profileSkipped) s2 = 'done';
  const s3: StepState = phase === 3 ? 'active' : 'todo';

  const states: StepState[] = [s1, s2, s3];
  const nums: (number | 'check')[] = [1, s2 === 'skipped' ? 'check' : 2, 3];

  const line1Done = phase >= 2;
  const line2Done = phase >= 3;

  const subClass = (i: 0 | 1 | 2) =>
    cn('mt-0.5 text-[11px] leading-tight', phase === i + 1 ? a.sub : 'text-[#b0b0bc]');

  const titleClass = (i: 0 | 1 | 2) =>
    cn(
      'mt-2 max-w-[160px] text-[13px] leading-tight',
      phase === i + 1 ? 'font-semibold text-[#0f0f12]' : 'font-normal text-[#7d7d87]',
    );

  return (
    <Card className="rounded-lg border-[#e5e5e9] bg-white shadow-none">
      <div className="flex w-full items-start px-3 pb-4 pt-3 sm:px-6">
        {steps3.map((step, index) => {
          const i = index as 0 | 1 | 2;
          const isLast = index === steps3.length - 1;
          const segmentDone = index === 0 ? line1Done : line2Done;

          return (
            <React.Fragment key={step.title}>
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <StepCircle n={nums[i]} state={states[i]} accent={accent} />
                <p className={titleClass(i)}>{step.title}</p>
                <p className={subClass(i)}>{step.sub}</p>
              </div>

              {!isLast && (
                <div
                  className="flex min-h-[44px] min-w-[20px] flex-1 items-center px-0.5 pt-0 sm:min-w-[40px] sm:px-2"
                  aria-hidden
                >
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-colors',
                      segmentDone ? a.line : 'bg-[#dcdce0]',
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};

export default QuickAttentionStepsBar;
