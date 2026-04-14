import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import cashRegisterCloseService, {
  PAYMENT_METHODS,
  DENOMINATIONS,
  CashClose,
  CreateCashClosePayload,
} from '@/services/cashRegisterCloseService';
import { useToast } from '@/components/ui/use-toast';

export interface PaymentMethodState {
  name: string;
  registered_amount: number;
  counted_amount: number;
}

export interface DenominationState {
  denomination: number;
  quantity: number;
}

export function useCashClose(closeDate: Date) {
  const { toast } = useToast();
  const dateStr = format(closeDate, 'yyyy-MM-dd');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodState[]>(() =>
    PAYMENT_METHODS.map((name) => ({ name, registered_amount: 0, counted_amount: 0 }))
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
        const found: CashClose | undefined = items[0];
        if (found) {
          setExistingClose(found);
          if (found.payment_methods?.length) setPaymentMethods(found.payment_methods);
          if (found.denominations?.length) setDenominations(found.denominations);
        } else {
          setExistingClose(null);
          setPaymentMethods(PAYMENT_METHODS.map((n) => ({ name: n, registered_amount: 0, counted_amount: 0 })));
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

  const handlePaymentChange = useCallback(
    (name: string, field: 'registered_amount' | 'counted_amount', value: number) => {
      setPaymentMethods((prev) => prev.map((m) => (m.name === name ? { ...m, [field]: value } : m)));
    },
    []
  );

  const handleDenominationChange = useCallback((denomination: number, quantity: number) => {
    setDenominations((prev) => prev.map((d) => (d.denomination === denomination ? { ...d, quantity } : d)));
  }, []);

  const buildPayload = (): CreateCashClosePayload => ({
    close_date: dateStr,
    payment_methods: paymentMethods,
    denominations,
  });

  const handleSave = async (): Promise<CashClose | null> => {
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const resp = existingClose?.id
        ? await cashRegisterCloseService.update(existingClose.id, payload)
        : await cashRegisterCloseService.create(payload);
      const saved: CashClose = resp?.data ?? resp;
      setExistingClose(saved);
      toast({ title: 'Guardado', description: 'Borrador guardado correctamente.' });
      return saved;
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el cierre.', variant: 'destructive' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      let closeId = existingClose?.id;
      if (!closeId) {
        const created = await cashRegisterCloseService.create(buildPayload());
        const createdClose: CashClose = created?.data ?? created;
        closeId = createdClose?.id;
        setExistingClose(createdClose);
      }
      if (!closeId) throw new Error('ID no disponible');
      const resp = await cashRegisterCloseService.submit(closeId);
      setExistingClose(resp?.data ?? resp);
      toast({ title: 'Enviado', description: 'Cierre enviado para aprobación.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo enviar el cierre.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const totalRegistered = paymentMethods.reduce((s, m) => s + m.registered_amount, 0);
  const totalCounted = paymentMethods.reduce((s, m) => s + m.counted_amount, 0);
  const totalDifference = totalRegistered - totalCounted;
  const totalCashCounted = denominations.reduce((s, d) => s + d.denomination * d.quantity, 0);
  const isReadOnly = !!existingClose && existingClose.status !== 'draft';

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
    totalRegistered,
    totalCounted,
    totalDifference,
    totalCashCounted,
    isReadOnly,
  };
}
