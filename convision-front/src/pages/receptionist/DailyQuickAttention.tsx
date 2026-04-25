import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import dailyActivityReportService, {
  QuickAttentionItem,
} from '@/services/dailyActivityReportService';
import QuickAttentionStepsBar from '@/pages/receptionist/QuickAttentionStepsBar';
import DailyQuickAttentionActions from '@/pages/receptionist/DailyQuickAttentionActions';
import DailyQuickAttentionStepCard from '@/pages/receptionist/DailyQuickAttentionStepCard';
import {
  quickAttentionErrorMessage,
  quickAttentionNeedsAmount,
  quickAttentionNeedsProfile,
} from '@/pages/receptionist/dailyQuickAttentionHelpers';

const HELPERS: Record<1 | 2 | 3, string> = {
  1: 'Un paso a la vez: primero el ítem, luego el perfil y la observación. Puedes volver más tarde si no alcanzas.',
  2: 'Indica el perfil del visitante (hombre, mujer o niño). Luego podrás añadir una observación breve.',
  3: 'Último paso: añade una nota breve si aplica, o finaliza sin texto. El registro queda en el reporte diario.',
};

const HELPER_STEP2_AMOUNT =
  'Ingresa el monto en pesos que recibiste por este concepto. Luego podrás añadir una observación opcional.';

const HELPER_STEP1_NO_PROFILE =
  'Este tipo de atención no desglosa por género: solo suma el contador y una nota opcional. El siguiente paso es la observación.';

const DAILY_REPORT_LIST_PATH = '/receptionist/daily-report';
const PRIMARY_CTA_CLASS = 'bg-[#8753ef] hover:bg-[#7345d6] text-white';
const CHIP_SELECTED = 'border-[#8753ef] bg-[#f1edff] text-[#8753ef]';
const CHIP_IDLE = 'border-[#e5e5e9] bg-white text-[#7d7d87] hover:bg-muted/40';
const HEADER_TINT = 'bg-[#f1edff]';

const DailyQuickAttention: React.FC = () => {
  const navigate = useNavigate();

  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [item, setItem] = useState<QuickAttentionItem | ''>('');
  const [profile, setProfile] = useState<'hombre' | 'mujer' | 'nino' | ''>('');
  const [note, setNote] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const needsAmount = Boolean(item && quickAttentionNeedsAmount(item as QuickAttentionItem));
  const needsProfile = Boolean(item && quickAttentionNeedsProfile(item as QuickAttentionItem));
  const profileSkipped = Boolean(item && step === 3 && !needsProfile && !needsAmount);
  const omitProfileStep = Boolean(item && !needsProfile && !needsAmount);

  const parsedAmount = useMemo(() => {
    const t = amountStr.trim().replace(/\s/g, '').replace(',', '.');
    if (t === '') return NaN;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const amountValid = parsedAmount > 0;

  const helperLine = useMemo(() => {
    if (step === 1 && omitProfileStep) return HELPER_STEP1_NO_PROFILE;
    if (step === 2 && needsAmount) return HELPER_STEP2_AMOUNT;
    return HELPERS[step];
  }, [step, omitProfileStep, needsAmount]);

  const submit = async () => {
    if (!item) return;
    if (quickAttentionNeedsAmount(item) && !amountValid) return;
    setSubmitting(true);
    try {
      await dailyActivityReportService.quickAttention({
        item,
        profile: quickAttentionNeedsProfile(item) ? (profile || undefined) : undefined,
        amount: quickAttentionNeedsAmount(item) ? parsedAmount : undefined,
        note: note.trim() || undefined,
      });
      toast({ title: 'Registrado', description: 'Se actualizó el reporte del día.' });
      navigate(DAILY_REPORT_LIST_PATH);
    } catch (err) {
      toast({
        title: 'Error',
        description: quickAttentionErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#f5f5f6]">
      <header className="flex min-h-[56px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e5e9] bg-white px-6 py-2">
        <div className="min-w-0">
          <h1 className="text-[16px] font-semibold leading-tight text-[#0f0f12]">
            Registro rápido de atención
          </h1>
          <p className="text-[12px] text-[#7d7d87]">
            Nota por cliente al salir · {today}. Se totaliza en el reporte diario.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="rounded-full border-[#f4c678] bg-[#fff6e3] px-3 py-1.5 text-[11px] font-semibold text-[#b57218]"
          >
            Pendiente
          </Badge>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-5">
        <QuickAttentionStepsBar
          phase={step}
          profileSkipped={profileSkipped}
          omitProfileStep={omitProfileStep}
          middleVariant={needsAmount ? 'amount' : 'profile'}
          accent="receptionist"
        />
        <p className="text-[12px] text-[#7d7d87]">{helperLine}</p>

        <DailyQuickAttentionStepCard
          step={step}
          item={item}
          profile={profile}
          note={note}
          amountStr={amountStr}
          headerTint={HEADER_TINT}
          chipSelected={CHIP_SELECTED}
          chipIdle={CHIP_IDLE}
          onItemChange={(v) => {
            setItem(v);
            setAmountStr('');
          }}
          onProfileChange={setProfile}
          onNoteChange={setNote}
          onAmountStrChange={setAmountStr}
        />

        <div className="min-h-4 flex-1" />

        <DailyQuickAttentionActions
          step={step}
          item={item}
          profile={profile}
          needsProfileFn={quickAttentionNeedsProfile}
          needsAmountFn={quickAttentionNeedsAmount}
          amountValid={amountValid}
          dailyReportListPath={DAILY_REPORT_LIST_PATH}
          primaryCtaClass={PRIMARY_CTA_CLASS}
          submitting={submitting}
          onContinueFrom1={() => {
            if (!item) return;
            if (quickAttentionNeedsProfile(item)) setStep(2);
            else if (quickAttentionNeedsAmount(item)) setStep(2);
            else setStep(3);
          }}
          onContinueFrom2={() => setStep(3)}
          onBackFrom2={() => setStep(1)}
          onBackFrom3={() =>
            setStep(
              quickAttentionNeedsProfile(item as QuickAttentionItem) ||
                quickAttentionNeedsAmount(item as QuickAttentionItem)
                ? 2
                : 1,
            )
          }
          onSubmit={submit}
        />
      </div>
    </div>
  );
};

export default DailyQuickAttention;
