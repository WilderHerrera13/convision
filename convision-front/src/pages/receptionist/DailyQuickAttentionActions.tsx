import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuickAttentionItem } from '@/services/dailyActivityReportService';

type Props = {
  step: 1 | 2 | 3;
  item: QuickAttentionItem | '';
  profile: 'hombre' | 'mujer' | 'nino' | '';
  needsProfileFn: (item: QuickAttentionItem) => boolean;
  dailyReportListPath: string;
  primaryCtaClass: string;
  submitting: boolean;
  onContinueFrom1: () => void;
  onContinueFrom2: () => void;
  onBackFrom2: () => void;
  onBackFrom3: () => void;
  onSubmit: () => void;
};

const DailyQuickAttentionActions: React.FC<Props> = ({
  step,
  item,
  profile,
  needsProfileFn,
  dailyReportListPath,
  primaryCtaClass,
  submitting,
  onContinueFrom1,
  onContinueFrom2,
  onBackFrom2,
  onBackFrom3,
  onSubmit,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-transparent pt-2">
    {step === 1 && (
      <>
        <Button variant="outline" className="rounded-lg border-[#e5e5e9] bg-white px-4 py-2.5" asChild>
          <Link to={dailyReportListPath}>Cancelar</Link>
        </Button>
        <Button
          className={cn('rounded-lg px-4 py-2.5 font-semibold', primaryCtaClass)}
          disabled={!item}
          onClick={onContinueFrom1}
        >
          Continuar
        </Button>
      </>
    )}
    {step === 2 && (
      <>
        <Button variant="outline" className="rounded-lg border-[#e5e5e9] bg-white px-4 py-2.5" onClick={onBackFrom2}>
          Atrás
        </Button>
        <Button
          className={cn('rounded-lg px-4 py-2.5 font-semibold', primaryCtaClass)}
          disabled={needsProfileFn(item as QuickAttentionItem) && !profile}
          onClick={onContinueFrom2}
        >
          Continuar
        </Button>
      </>
    )}
    {step === 3 && (
      <>
        <Button variant="outline" className="rounded-lg border-[#e5e5e9] bg-white px-4 py-2.5" onClick={onBackFrom3}>
          Atrás
        </Button>
        <Button
          className={cn('rounded-lg px-4 py-2.5 font-semibold', primaryCtaClass)}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finalizar registro
        </Button>
      </>
    )}
  </div>
);

export default DailyQuickAttentionActions;
