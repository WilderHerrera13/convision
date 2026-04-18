import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  QUICK_ATTENTION_ITEMS,
  QuickAttentionItem,
} from '@/services/dailyActivityReportService';
import DailyQuickAttentionObservation from '@/pages/receptionist/DailyQuickAttentionObservation';
import {
  QUICK_PROFILE_OPTIONS,
  quickAttentionNeedsAmount,
} from '@/pages/receptionist/dailyQuickAttentionHelpers';

type Props = {
  step: 1 | 2 | 3;
  item: QuickAttentionItem | '';
  profile: 'hombre' | 'mujer' | 'nino' | '';
  note: string;
  amountStr: string;
  headerTint: string;
  chipSelected: string;
  chipIdle: string;
  onItemChange: (v: QuickAttentionItem) => void;
  onProfileChange: (v: 'hombre' | 'mujer' | 'nino') => void;
  onNoteChange: (v: string) => void;
  onAmountStrChange: (v: string) => void;
};

const DailyQuickAttentionStepCard: React.FC<Props> = ({
  step,
  item,
  profile,
  note,
  amountStr,
  headerTint,
  chipSelected,
  chipIdle,
  onItemChange,
  onProfileChange,
  onNoteChange,
  onAmountStrChange,
}) => (
  <Card className="overflow-hidden rounded-xl border-[#e5e5e9] shadow-none">
    <CardHeader className={cn('space-y-0 px-4 py-3.5', headerTint)}>
      <CardTitle className="text-[14px] font-semibold text-[#121215]">
        {step === 1 && 'Atención al cliente · elige el ítem'}
        {step === 2 &&
          (item && quickAttentionNeedsAmount(item) ? 'Monto recibido' : 'Perfil del visitante')}
        {step === 3 && 'Observación (opcional)'}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 p-4">
      {step === 1 && (
        <>
          <div className="flex flex-wrap gap-3">
            {QUICK_ATTENTION_ITEMS.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => onItemChange(it.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-[13px] transition-colors',
                  item === it.value ? chipSelected : chipIdle,
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-[#7d7d87]">Selecciona un ítem y pulsa Continuar.</p>
        </>
      )}
      {step === 2 && item && quickAttentionNeedsAmount(item) && (
        <>
          <div className="space-y-2">
            <label htmlFor="qa-amount" className="text-[12px] font-medium text-[#0f0f12]">
              Monto (COP)
            </label>
            <Input
              id="qa-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ej. 150000"
              value={amountStr}
              onChange={(e) => onAmountStrChange(e.target.value)}
              className="h-11 rounded-lg border-[#dcdce0] text-[15px] tabular-nums"
            />
          </div>
          <p className="text-[12px] text-[#7d7d87]">Ingresa el valor recibido y pulsa Continuar.</p>
        </>
      )}
      {step === 2 && !(item && quickAttentionNeedsAmount(item)) && (
        <>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            {QUICK_PROFILE_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onProfileChange(p.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-[13px] transition-colors',
                  profile === p.value ? chipSelected : 'border-[#dcdce0] bg-white text-[#7d7d87]',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-[#7d7d87]">Selecciona un perfil y pulsa Continuar.</p>
        </>
      )}
      {step === 3 && <DailyQuickAttentionObservation note={note} onNoteChange={onNoteChange} />}
    </CardContent>
  </Card>
);

export default DailyQuickAttentionStepCard;
