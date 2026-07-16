import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import cashRegisterCloseService, {
  type CashCloseAdjustment,
  type CashCloseSnapshot,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodName,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

interface Props {
  closeId: number;
  canAcknowledge?: boolean;
}

function paymentMap(snapshot: CashCloseSnapshot): Record<string, number> {
  const map: Record<string, number> = {};
  (snapshot.payment_methods ?? []).forEach((p) => {
    map[p.name] = p.counted_amount;
  });
  return map;
}

const AdjustmentCard: React.FC<{ adj: CashCloseAdjustment; canAcknowledge?: boolean }> = ({ adj, canAcknowledge }) => {
  const qc = useQueryClient();
  const before = paymentMap(adj.before_snapshot);
  const after = paymentMap(adj.after_snapshot);
  const methodNames = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  const ack = useMutation({
    mutationFn: () => cashRegisterCloseService.acknowledgeAdjustment(adj.id),
    onSuccess: () => {
      toast.success('Advertencia confirmada.');
      void qc.invalidateQueries({ queryKey: ['cash-close-adjustments', adj.cash_register_close_id] });
      void qc.invalidateQueries({ queryKey: ['admin-notifications-summary'] });
    },
    onError: () => toast.error('No se pudo confirmar la advertencia.'),
  });

  const adminName = adj.admin_user ? `${adj.admin_user.name} ${adj.admin_user.last_name ?? ''}`.trim() : 'Administrador';
  const createdAt = adj.created_at ? new Date(adj.created_at).toLocaleString('es-CO') : '';

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#f4c778] bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#f4c778]/60 bg-[#fff6e3] px-4 py-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#b57218]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#b57218]">Cierre ajustado por el administrador</p>
          <p className="mt-0.5 text-[12px] text-[#8a6a2c]">
            {adminName} · {createdAt}
          </p>
          <p className="mt-1 text-[12px] text-convision-text">
            <span className="font-semibold">Motivo:</span> {adj.reason}
          </p>
        </div>
        {adj.acknowledged_at ? (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#228b52]">
            <CheckCircle2 className="size-3.5" /> Confirmado
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto px-4 py-3">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-convision-text-secondary">
              <th className="py-1.5 text-left font-semibold">Medio de pago</th>
              <th className="py-1.5 text-right font-semibold">Reportado (asesor)</th>
              <th className="py-1.5 text-center font-semibold" aria-hidden />
              <th className="py-1.5 text-right font-semibold">Corregido (admin)</th>
            </tr>
          </thead>
          <tbody>
            {methodNames.map((name) => {
              const b = before[name] ?? 0;
              const a = after[name] ?? 0;
              const changed = Math.round(b) !== Math.round(a);
              return (
                <tr key={name} className={`border-t border-convision-border-subtle ${changed ? 'bg-[#fffaf0]' : ''}`}>
                  <td className="py-1.5 text-left text-convision-text">
                    {PAYMENT_METHOD_LABELS[name as PaymentMethodName] ?? name}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-convision-text-secondary">{formatCOP(b)}</td>
                  <td className="py-1.5 text-center text-convision-text-secondary">
                    {changed ? <ArrowRight className="mx-auto size-3.5 text-[#b57218]" /> : ''}
                  </td>
                  <td className={`py-1.5 text-right tabular-nums ${changed ? 'font-semibold text-[#b57218]' : 'text-convision-text'}`}>
                    {formatCOP(a)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-convision-primary/40 bg-convision-light">
              <td className="py-2 text-left text-[12px] font-bold uppercase tracking-wide text-convision-primary">Total</td>
              <td className="py-2 text-right tabular-nums font-semibold text-convision-text-secondary">
                {formatCOP(adj.before_snapshot.total_counted)}
              </td>
              <td aria-hidden />
              <td className="py-2 text-right tabular-nums font-bold text-convision-primary">
                {formatCOP(adj.after_snapshot.total_counted)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canAcknowledge && !adj.acknowledged_at ? (
        <div className="flex justify-end border-t border-convision-border-subtle px-4 py-3">
          <Button onClick={() => ack.mutate()} disabled={ack.isPending}>
            {ack.isPending ? 'Confirmando…' : 'Entendido'}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const CashCloseAdjustmentComparison: React.FC<Props> = ({ closeId, canAcknowledge }) => {
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ['cash-close-adjustments', closeId],
    queryFn: () => cashRegisterCloseService.getAdjustments(closeId),
    enabled: !!closeId,
  });

  if (isLoading || !adjustments || adjustments.length === 0) return null;

  return (
    <div className="space-y-3">
      {adjustments
        .slice()
        .reverse()
        .map((adj) => (
          <AdjustmentCard key={adj.id} adj={adj} canAcknowledge={canAcknowledge} />
        ))}
    </div>
  );
};

export default CashCloseAdjustmentComparison;
