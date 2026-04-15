import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  QUICK_ATTENTION_ITEMS,
  QuickAttentionItem,
} from '@/services/dailyActivityReportService';
import DailyQuickAttentionObservation from '@/pages/receptionist/DailyQuickAttentionObservation';
import { QUICK_PROFILE_OPTIONS } from '@/pages/receptionist/dailyQuickAttentionHelpers';

type Props = {
  step: 1 | 2 | 3;
  item: QuickAttentionItem | '';
  profile: 'hombre' | 'mujer' | 'nino' | '';
  note: string;
  headerTint: string;
  chipSelected: string;
  chipIdle: string;
  onItemChange: (v: QuickAttentionItem) => void;
  onProfileChange: (v: 'hombre' | 'mujer' | 'nino') => void;
  onNoteChange: (v: string) => void;
};

const DailyQuickAttentionStepCard: React.FC<Props> = ({
  step,
  item,
  profile,
  note,
  headerTint,
  chipSelected,
  chipIdle,
  onItemChange,
  onProfileChange,
  onNoteChange,
}) => (
  <Card className="overflow-hidden rounded-xl border-[#e5e5e9] shadow-none">
    <CardHeader className={cn('space-y-0 px-4 py-3.5', headerTint)}>
      <CardTitle className="text-[14px] font-semibold text-[#121215]">
        {step === 1 && 'Atención al cliente · elige el ítem'}
        {step === 2 && 'Perfil del visitante'}
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
      {step === 2 && (
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
