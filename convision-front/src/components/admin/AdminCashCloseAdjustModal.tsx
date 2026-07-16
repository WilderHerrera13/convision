import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CashPaymentMethodRow from '@/components/cashClose/CashPaymentMethodRow';
import DenominationCountRow from '@/components/cashClose/DenominationCountRow';
import cashRegisterCloseService, {
  DENOMINATIONS,
  PAYMENT_METHODS,
  type PaymentMethodName,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeId: number | null;
  closeDate: string | null;
  initialPaymentMethods: { name: string; counted_amount: number }[];
  initialDenominations: { denomination: number; quantity: number }[];
  onAdjusted: () => void;
}

const NON_CASH_METHODS = PAYMENT_METHODS.filter((m) => m !== 'efectivo') as PaymentMethodName[];

const AdminCashCloseAdjustModal: React.FC<Props> = ({
  open,
  onOpenChange,
  closeId,
  closeDate,
  initialPaymentMethods,
  initialDenominations,
  onAdjusted,
}) => {
  const [denomQty, setDenomQty] = useState<Record<number, number>>({});
  const [methodAmounts, setMethodAmounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [seededFor, setSeededFor] = useState<number | null>(null);

  // Seed editable state from the submitted close whenever a new close is opened.
  if (open && closeId != null && seededFor !== closeId) {
    const denoms: Record<number, number> = {};
    initialDenominations.forEach((d) => {
      denoms[d.denomination] = d.quantity;
    });
    const amounts: Record<string, number> = {};
    initialPaymentMethods.forEach((p) => {
      amounts[p.name] = p.counted_amount;
    });
    setDenomQty(denoms);
    setMethodAmounts(amounts);
    setReason('');
    setAdminNotes('');
    setSeededFor(closeId);
  }

  const efectivoTotal = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + d * (denomQty[d] ?? 0), 0),
    [denomQty],
  );

  const handleSubmit = async () => {
    if (closeId == null) return;
    if (reason.trim() === '') {
      toast.error('Debes indicar el motivo del ajuste.');
      return;
    }
    setSaving(true);
    try {
      const payment_methods = [
        { name: 'efectivo', counted_amount: efectivoTotal },
        ...NON_CASH_METHODS.map((name) => ({ name, counted_amount: Math.max(0, Math.round(methodAmounts[name] ?? 0)) })),
      ];
      const denominations = DENOMINATIONS.map((d) => ({ denomination: d, quantity: denomQty[d] ?? 0 }));
      await cashRegisterCloseService.adjust(closeId, {
        payment_methods,
        denominations,
        admin_notes: adminNotes.trim() || null,
        reason: reason.trim(),
      });
      toast.success('Cierre ajustado y aprobado. Se notificó al asesor.');
      setSeededFor(null);
      onOpenChange(false);
      onAdjusted();
    } catch {
      toast.error('No se pudo ajustar el cierre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSeededFor(null); onOpenChange(o); }}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar y aprobar cierre</DialogTitle>
          <DialogDescription>
            {closeDate ? `Corrige los valores reportados del ${closeDate} y apruébalo. ` : ''}
            Se guardará una versión con el antes/después y se registrará una advertencia para el asesor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-convision-text">Denominaciones (efectivo)</h4>
            <div className="rounded-lg border border-convision-border-subtle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denominación</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DENOMINATIONS.map((d, idx) => (
                    <DenominationCountRow
                      key={d}
                      denomination={d}
                      quantity={denomQty[d] ?? 0}
                      stripe={idx % 2 === 1}
                      onChange={(denom, qty) => setDenomQty((prev) => ({ ...prev, [denom]: qty }))}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-convision-light px-3 py-2 text-[13px] font-semibold text-convision-primary">
              <span>Total efectivo contado</span>
              <span className="tabular-nums">{formatCOP(efectivoTotal)}</span>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-convision-text">Otros medios de pago</h4>
            <div className="rounded-lg border border-convision-border-subtle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medio de pago</TableHead>
                    <TableHead>Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {NON_CASH_METHODS.map((name) => (
                    <CashPaymentMethodRow
                      key={name}
                      name={name}
                      countedAmount={methodAmounts[name] ?? 0}
                      isCashEquivalent={name === 'anticipo' || name === 'pago_sistecredito'}
                      onChange={(n, v) => setMethodAmounts((prev) => ({ ...prev, [n]: v }))}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <label htmlFor="adjust-reason" className="text-[13px] font-semibold text-convision-text">
              Motivo del ajuste <span className="text-[#b82626]">*</span>
            </label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica qué se corrigió y por qué (visible para el asesor)."
              rows={3}
            />
            <label htmlFor="adjust-notes" className="text-[13px] font-semibold text-convision-text">
              Notas del administrador (opcional)
            </label>
            <Textarea
              id="adjust-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Ajustar y aprobar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminCashCloseAdjustModal;
