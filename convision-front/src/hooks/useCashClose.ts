import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast as sonnerToast } from 'sonner';
import { isAxiosError } from 'axios';
import cashRegisterCloseService, {
  PAYMENT_METHODS,
  DENOMINATIONS,
  CashClose,
  CreateCashClosePayload,
} from '@/services/cashRegisterCloseService';

function submitErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { errors?: { submit?: string[] }; message?: string } | undefined;
    const fromSubmit = data?.errors?.submit?.[0];
    if (fromSubmit) return fromSubmit;
    if (typeof data?.message === 'string') return data.message;
  }
  return 'No se pudo enviar el cierre.';
}

export interface PaymentMethodState {
  name: string;
  counted_amount: number;
}

export interface DenominationState {
  denomination: number;
  quantity: number;
}

type RawPaymentRow = {
  name?: string;
  payment_method_name?: string;
  counted_amount?: number;
};

function normalizePaymentMethods(raw: unknown): PaymentMethodState[] {
  if (!Array.isArray(raw)) {
    return PAYMENT_METHODS.map((name) => ({ name, counted_amount: 0 }));
  }
  return PAYMENT_METHODS.map((name) => {
    const row = raw.find(
      (r: RawPaymentRow) => r.name === name || r.payment_method_name === name
    );
    return { name, counted_amount: Number(row?.counted_amount ?? 0) };
  });
}

export function useCashClose(closeDate: Date) {
  const dateStr = format(closeDate, 'yyyy-MM-dd');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodState[]>(() =>
    PAYMENT_METHODS.map((name) => ({ name, counted_amount: 0 }))
  );
  const [denominations, setDenominations] = useState<DenominationState[]>(() =>
    DENOMINATIONS.map((d) => ({ denomination: d, quantity: 0 }))
  );
  const [existingClose, setExistingClose] = useState<CashClose | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchExisting = async () => {
      setIsLoading(true);
      try {
        const resp = await cashRegisterCloseService.list({ close_date: dateStr });
        const items = resp?.data ?? (Array.isArray(resp) ? resp : []);
        const found = items[0] as CashClose | undefined;

        if (found?.id) {
          const detailResp = await cashRegisterCloseService.get(found.id);
          const detail: CashClose = detailResp?.data ?? detailResp;
          setExistingClose(detail);
          const ext = detail as CashClose & { payments?: RawPaymentRow[] };
          const pm = ext.payment_methods?.length ? ext.payment_methods : ext.payments;
          setPaymentMethods(normalizePaymentMethods(pm));
          if (detail.denominations?.length) setDenominations(detail.denominations);
        } else {
          setExistingClose(null);
          setPaymentMethods(PAYMENT_METHODS.map((n) => ({ name: n, counted_amount: 0 })));
          setDenominations(DENOMINATIONS.map((d) => ({ denomination: d, quantity: 0 })));
        }
      } catch {
        setExistingClose(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExisting();
  }, [dateStr]);

  const handlePaymentChange = useCallback((name: string, counted_amount: number) => {
    setPaymentMethods((prev) => prev.map((m) => (m.name === name ? { ...m, counted_amount } : m)));
  }, []);

  const handleDenominationChange = useCallback((denomination: number, quantity: number) => {
    setDenominations((prev) => prev.map((d) => (d.denomination === denomination ? { ...d, quantity } : d)));
  }, []);

  const buildPayload = (): CreateCashClosePayload => ({
    close_date: dateStr,
    payment_methods: paymentMethods,
    denominations,
  });

  const totalCounted = paymentMethods.reduce((s, m) => s + m.counted_amount, 0);
  const totalCashCounted = denominations.reduce((s, d) => s + d.denomination * d.quantity, 0);
  const isReadOnly = !!existingClose && existingClose.status !== 'draft';

  /**
   * Persiste el estado actual (crea o actualiza según si existe cierre).
   * Retorna el cierre guardado o null en caso de error.
   */
  const persistClose = async (): Promise<CashClose | null> => {
    const payload = buildPayload();
    const resp = existingClose?.id
      ? await cashRegisterCloseService.update(existingClose.id, payload)
      : await cashRegisterCloseService.create(payload);
    const saved: CashClose = resp?.data ?? resp;
    setExistingClose(saved);
    return saved;
  };

  const handleSave = async (): Promise<CashClose | null> => {
    setIsSaving(true);
    try {
      const saved = await persistClose();
      sonnerToast.success('Borrador guardado', {
        description: 'Los datos del cierre fueron guardados correctamente.',
      });
      return saved;
    } catch {
      sonnerToast.error('Error al guardar', {
        description: 'No se pudo guardar el cierre. Intenta nuevamente.',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (totalCounted <= 0 && totalCashCounted <= 0) {
      sonnerToast.error('No se puede enviar el cierre', {
        description:
          'Ingresa al menos un valor contado en medios de pago o completa el arqueo de efectivo.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await persistClose();
      if (!saved?.id) throw new Error('ID no disponible tras guardar.');

      const resp = await cashRegisterCloseService.submit(saved.id);
      setExistingClose(resp?.data ?? resp);

      sonnerToast.success('Cierre enviado', {
        description: 'El cierre quedó registrado y pendiente de aprobación por administración.',
        duration: 6000,
      });
    } catch (e) {
      sonnerToast.error('No se pudo enviar el cierre', {
        description: submitErrorMessage(e),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    paymentMethods,
    denominations,
    existingClose,
    isLoading,
    isSaving,
    handlePaymentChange,
    handleDenominationChange,
    handleSave,
    handleSubmit,
    totalCounted,
    totalCashCounted,
    isReadOnly,
  };
}
