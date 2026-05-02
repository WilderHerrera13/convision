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
import { formatCOPGroupedInput } from '@/lib/formatMoney';

type ItemValue = QuickAttentionItem;

const ATTENTION_ITEMS: ItemValue[] = [
  'preguntas', 'cotizaciones', 'consultas_efectivas',
  'consulta_venta_formula', 'consultas_no_efectivas',
];

const OPERATIONS_ITEMS: ItemValue[] = [
  'bonos_entregados', 'bonos_redimidos', 'sistecreditos_realizados', 'addi_realizados',
  'control_seguimiento', 'seguimiento_garantias', 'ordenes', 'plan_separe',
  'otras_ventas', 'entregas', 'sistecreditos_abonos',
];

const MONEY_ITEMS: ItemValue[] = [
  'valor_ordenes', 'voucher', 'bancolombia', 'daviplata', 'nequi',
  'addi_recibido', 'sistecredito_recibido', 'compras',
  'anticipos_recibidos', 'anticipos_por_cru', 'bono_regalo_recibido', 'pago_sistecredito',
];

const ITEM_GROUPS = [
  { title: 'Atención al cliente', keys: ATTENTION_ITEMS },
  { title: 'Operaciones', keys: OPERATIONS_ITEMS },
  { title: 'Dinero recibido', keys: MONEY_ITEMS },
] as const;

const ITEM_LABEL = Object.fromEntries(QUICK_ATTENTION_ITEMS.map((i) => [i.value, i.label])) as Record<ItemValue, string>;

const AMOUNT_PLACEHOLDER = formatCOPGroupedInput(150000);

type Props = {
  step: 1 | 2 | 3;
  item: QuickAttentionItem | '';
  profile: 'hombre' | 'mujer' | 'nino' | '';
  note: string;
  amountDisplay: string;
  amountPreview: string | null;
  headerTint: string;
  chipSelected: string;
  chipIdle: string;
  onItemChange: (v: QuickAttentionItem) => void;
  onProfileChange: (v: 'hombre' | 'mujer' | 'nino') => void;
  onNoteChange: (v: string) => void;
  onAmountDigitsInput: (raw: string) => void;
};

const DailyQuickAttentionStepCard: React.FC<Props> = ({
  step,
  item,
  profile,
  note,
  amountDisplay,
  amountPreview,
  headerTint,
  chipSelected,
  chipIdle,
  onItemChange,
  onProfileChange,
  onNoteChange,
  onAmountDigitsInput,
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
        <div className="space-y-4">
          {ITEM_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7d7d87]">
                {group.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.keys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onItemChange(key)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-[13px] transition-colors',
                      item === key ? chipSelected : chipIdle,
                    )}
                  >
                    {ITEM_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[12px] text-[#7d7d87]">Selecciona un ítem y pulsa Continuar.</p>
        </div>
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
              inputMode="numeric"
              autoComplete="off"
              placeholder={AMOUNT_PLACEHOLDER}
              value={amountDisplay}
              onChange={(e) => onAmountDigitsInput(e.target.value)}
              className="h-11 rounded-lg border-[#dcdce0] text-[15px] tabular-nums"
            />
          </div>
          {amountPreview ? (
            <p className="text-[13px] font-semibold tabular-nums text-[#0f0f12]">{amountPreview}</p>
          ) : null}
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
