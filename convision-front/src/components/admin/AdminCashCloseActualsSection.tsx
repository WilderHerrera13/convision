import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { COPMoneyInput } from '@/components/ui/cop-money-input';
import AdminCashCloseMismatchAlert from '@/components/admin/AdminCashCloseMismatchAlert';
import cashRegisterCloseService, {
  CashClose,
  CashCloseReconciliationRow,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PaymentMethodName,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';
import { formatDateTime12h } from '@/lib/utils';

function buildAmountsFromClose(close: CashClose): Record<PaymentMethodName, number> {
  const rows = close.reconciliation?.payment_methods;
  const initial: Record<string, number> = {};
  for (const name of PAYMENT_METHODS) {
    const row = rows?.find((r) => r.name === name);
    initial[name] =
      row != null ? Math.max(0, Math.round(Number(row.admin_actual ?? 0))) : 0;
  }
  return initial as Record<PaymentMethodName, number>;
}

function advisorCountedForMethod(close: CashClose, name: PaymentMethodName): number {
  const row = close.payment_methods?.find((p) => p.name === name);
  return Math.round(Number(row?.counted_amount ?? 0));
}

function signedCOP(v: number) {
  if (v === 0) return formatCOP(0);
  return `${v > 0 ? '+' : '−'}${formatCOP(Math.abs(v))}`;
}

interface Props {
  close: CashClose;
  onUpdated: (data: CashClose) => void;
}

function AdminCashCloseActualsSection({ close, onUpdated }: Props) {
  const [amounts, setAmounts] = useState<Record<PaymentMethodName, number>>(() =>
    buildAmountsFromClose(close)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmounts(buildAmountsFromClose(close));
  }, [close]);

  const liveReconRows: CashCloseReconciliationRow[] = useMemo(
    () =>
      PAYMENT_METHODS.map((name) => {
        const advisor_counted = advisorCountedForMethod(close, name);
        const admin_actual = Math.max(0, Math.round(amounts[name] ?? 0));
        return {
          name,
          advisor_counted,
          admin_actual,
          variance: advisor_counted - admin_actual,
        };
      }),
    [close, amounts]
  );

  const advisorTotal = Math.round(Number(close.total_counted ?? 0));
  const adminDraftTotal = useMemo(
    () =>
      PAYMENT_METHODS.reduce(
        (sum, name) => sum + Math.max(0, Math.round(amounts[name] ?? 0)),
        0
      ),
    [amounts]
  );
  const varianceDraft = advisorTotal - adminDraftTotal;
  const hasMismatch = liveReconRows.some((r) => r.variance !== 0);

  const userName = close.user
    ? `${close.user.name} ${close.user.last_name ?? ''}`.trim()
    : 'Asesor';

  const handleSave = async () => {
    setSaving(true);
    try {
      const actual_payment_methods = PAYMENT_METHODS.map((name) => ({
        name,
        actual_amount: Math.max(0, Math.round(amounts[name] ?? 0)),
      }));
      const resp = await cashRegisterCloseService.putAdminActuals(close.id, {
        actual_payment_methods,
      });
      const data = (resp?.data ?? resp) as CashClose;
      onUpdated(data);
      toast.success('Totales reales guardados');
    } catch {
      toast.error('No se pudieron guardar los totales reales');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[10px] border-[#e5e5e9] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-[2.5fr_2px_2fr] border-b border-[#dcdce0]">
          <div className="grid grid-cols-[1.5fr_1fr] items-center justify-between px-4 py-3 bg-[#f7f7f8]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#7d7d87]" />
                <p className="text-sm font-semibold text-[#0f0f12]">Cierre del Asesor</p>
              </div>
              <p className="text-xs text-[#7d7d87] mt-0.5">
                Solo lectura — ingresado por {userName}
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit shrink-0 border-[#dcdce0] text-[11px] font-normal text-[#7d7d87]"
            >
              Solo lectura
            </Badge>
          </div>
          <div className="bg-[#dcdce0]" />
          <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#3a71f7]" />
                <p className="text-[13px] font-semibold text-[#f8fafc]">Ingreso del Administrador</p>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Invisible para el asesor — ingresa los valores reales del sistema contable
              </p>
            </div>
            <Badge className="w-fit shrink-0 border border-[#475569] bg-[#334155] text-[10px] font-semibold text-[#94a3b8] hover:bg-[#334155]">
              Solo Admin
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-[1.5fr_1fr_2px_1fr_1fr] border-b border-[#dcdce0] bg-[#f7f7f8] text-[11px] font-semibold text-[#7d7d87]">
          <div className="px-3 py-2.5">Medio de Pago</div>
          <div className="px-3 py-2.5 border-l border-[#dcdce0]">Declarado (Asesor)</div>
          <div className="bg-[#dcdce0]" />
          <div className="px-3 py-2.5 border-l border-[#dcdce0]">Real (Admin) ← editable</div>
          <div className="px-3 py-2.5 border-l border-[#dcdce0]">Diferencia</div>
        </div>

        <CardContent className="p-0">
          <div className="divide-y divide-[#dcdce0]">
            {PAYMENT_METHODS.map((name, idx) => {
              const row = liveReconRows[idx];
              const v = row.variance;
              return (
                <div
                  key={name}
                  className={`grid grid-cols-[1.5fr_1fr_2px_1fr_1fr] items-center ${idx % 2 === 1 ? 'bg-[#f7f7f8]' : 'bg-white'}`}
                >
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium text-[#0f0f12]">
                      {PAYMENT_METHOD_LABELS[name]}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 border-l border-[#dcdce0]">
                    <p className="text-[12px] text-[#7d7d87]">{formatCOP(row.advisor_counted)}</p>
                  </div>
                  <div className="bg-[#dcdce0] self-stretch" />
                  <div className="px-3 py-2 border-l border-[#dcdce0]">
                    <COPMoneyInput
                      value={amounts[name] ?? 0}
                      onChange={(n) =>
                        setAmounts((prev) => ({ ...prev, [name]: n }))
                      }
                      disabled={saving}
                      className="w-full max-w-[220px] border-[#dcdce0] shadow-none focus-visible:border-[#3a71f7] focus-visible:ring-[#3a71f7]/20"
                      aria-label={`Importe real ${PAYMENT_METHOD_LABELS[name]}`}
                    />
                  </div>
                  <div className="px-3 py-2.5 border-l border-[#dcdce0]">
                    {v === 0 ? (
                      <span className="inline-flex min-w-[4rem] justify-end rounded-full border border-[#dcdce0] bg-[#f7f7f8] px-2 py-0.5 text-[11px] font-semibold text-[#7d7d87]">
                        {formatCOP(0)}
                      </span>
                    ) : (
                      <span
                        className={
                          v > 0
                            ? 'inline-flex min-w-[4rem] justify-end rounded-full border border-[#f4c678] bg-[#fff6e3] px-2 py-0.5 text-[11px] font-semibold text-[#b57218]'
                            : 'inline-flex min-w-[4rem] justify-end rounded-full border border-[#f5baba] bg-[#ffeeed] px-2 py-0.5 text-[11px] font-semibold text-[#b82626]'
                        }
                      >
                        {signedCOP(v)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[2.5fr_2px_1fr_1fr] border-t-2 border-[#3a71f7] bg-[#eff1ff]">
            <div className="px-3 py-3 grid grid-cols-[1.5fr_1fr]">
              <div>
                <p className="text-[11px] font-bold text-[#3a71f7]">TOTAL ASESOR</p>
                <p className="text-sm font-bold text-[#3a71f7]">{formatCOP(advisorTotal)}</p>
              </div>
            </div>
            <div className="bg-[#c5d3f8]" />
            <div className="border-l border-[#c5d3f8] px-3 py-3">
              <p className="text-[11px] font-bold text-[#3a71f7]">TOTAL ADMIN</p>
              <p className="text-sm font-bold text-[#3a71f7]">{formatCOP(adminDraftTotal)}</p>
            </div>
            <div className="border-l border-[#c5d3f8] px-3 py-3 flex items-center">
              <span
                className={
                  varianceDraft === 0
                    ? 'inline-flex rounded-full border border-[#dcdce0] bg-[#f7f7f8] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#7d7d87]'
                    : varianceDraft > 0
                      ? 'inline-flex rounded-full border border-[#f4c678] bg-[#fff6e3] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#b57218]'
                      : 'inline-flex rounded-full border border-[#f5baba] bg-[#ffeeed] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#b82626]'
                }
              >
                {signedCOP(varianceDraft)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#dcdce0] bg-[#f7f7f8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-[#7d7d87]">
              {close.admin_actuals_recorded_at ? (
                <>
                  Último registro:{' '}
                  {formatDateTime12h(close.admin_actuals_recorded_at)}
                </>
              ) : (
                'Aún no hay totales reales guardados.'
              )}
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#3a71f7] shadow-[0px_2px_8px_0px_rgba(58,113,247,0.2)] hover:bg-[#2f5fd4] sm:w-[200px]"
            >
              {saving ? 'Guardando…' : 'Guardar totales reales'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="overflow-hidden rounded-[10px] border-[#c5d3f8] bg-[#eff1ff] shadow-[0px_2px_12px_0px_rgba(58,113,247,0.12)]">
          <div className="flex border-l-4 border-l-[#3a71f7]">
            <CardContent className="flex-1 space-y-1 pt-4">
              <p className="text-[11px] text-[#7d7d87]">Total declarado (asesor)</p>
              <p className="text-2xl font-bold text-[#3a71f7]">{formatCOP(advisorTotal)}</p>
              <p className="text-[11px] text-[#7d7d87]">Suma de medios de pago</p>
            </CardContent>
          </div>
        </Card>
        <Card className="overflow-hidden rounded-[10px] border-[#a3d9b8] bg-[#ebf5ef] shadow-[0px_2px_12px_0px_rgba(34,139,82,0.12)]">
          <div className="flex border-l-4 border-l-[#228b52]">
            <CardContent className="flex-1 space-y-1 pt-4">
              <p className="text-[11px] text-[#7d7d87]">Total real (admin)</p>
              <p className="text-2xl font-bold text-[#228b52]">{formatCOP(adminDraftTotal)}</p>
              <p className="text-[11px] text-[#7d7d87]">Ingresado por el administrador</p>
            </CardContent>
          </div>
        </Card>
        <Card className={`overflow-hidden rounded-[10px] shadow-[0px_2px_12px_0px_rgba(181,114,24,0.12)] ${varianceDraft === 0 ? 'border-[#a3d9b8] bg-[#ebf5ef]' : 'border-[#f4c678] bg-[#fff6e3]'}`}>
          <div className={`flex border-l-4 ${varianceDraft === 0 ? 'border-l-[#228b52]' : 'border-l-[#b57218]'}`}>
            <CardContent className="flex-1 space-y-1 pt-4">
              <p className="text-[11px] text-[#7d7d87]">Diferencia (asesor − real)</p>
              <p className={`text-2xl font-bold ${varianceDraft === 0 ? 'text-[#228b52]' : 'text-[#b57218]'}`}>
                {signedCOP(varianceDraft)}
              </p>
              <p className="text-[11px] text-[#7d7d87]">
                {varianceDraft > 0
                  ? 'El asesor declaró más de lo real'
                  : varianceDraft < 0
                    ? 'El asesor declaró menos de lo real'
                    : 'Sin diferencia'}
              </p>
            </CardContent>
          </div>
        </Card>
      </div>

      {hasMismatch && (
        <AdminCashCloseMismatchAlert
          advisorTotal={advisorTotal}
          adminTotal={adminDraftTotal}
          variance={varianceDraft}
          compensatedTotals={varianceDraft === 0}
        />
      )}

      <Card className="overflow-hidden rounded-[10px] border-[#e5e5e9] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
        <div className="border-b border-[#dcdce0] bg-[#f7f7f8] px-4 py-3">
          <p className="text-sm font-semibold text-[#0f0f12]">Conciliación por Medio de Pago</p>
          <p className="text-xs text-[#7d7d87]">
            Comparación entre lo declarado por el asesor y lo registrado por el administrador
          </p>
        </div>
        <CardContent className="p-0">
          <div>
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-[#dcdce0] bg-[#f7f7f8] text-[11px] font-semibold text-[#7d7d87]">
              <div className="px-3 py-2.5">Medio de Pago</div>
              <div className="px-3 py-2.5 border-l border-[#dcdce0]">Declarado (Asesor)</div>
              <div className="px-3 py-2.5 border-l border-[#dcdce0]">Real (Admin)</div>
              <div className="px-3 py-2.5 border-l border-[#dcdce0]">Diferencia</div>
            </div>
            {liveReconRows.map((row, idx) => {
              const v = row.variance;
              return (
                <div
                  key={row.name}
                  className={`grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-[#dcdce0] text-sm ${idx % 2 === 1 ? 'bg-[#f7f7f8]' : 'bg-white'}`}
                >
                  <div className="px-3 py-2.5 font-medium text-[#0f0f12]">
                    {PAYMENT_METHOD_LABELS[row.name as PaymentMethodName] ?? row.name}
                  </div>
                  <div className="px-3 py-2.5 border-l border-[#dcdce0] text-[#7d7d87]">
                    {formatCOP(row.advisor_counted)}
                  </div>
                  <div className="px-3 py-2.5 border-l border-[#dcdce0] text-[#7d7d87]">
                    {formatCOP(row.admin_actual)}
                  </div>
                  <div className="px-3 py-2.5 border-l border-[#dcdce0]">
                    {v === 0 ? (
                      <span className="inline-flex min-w-[4rem] justify-end rounded-full border border-[#dcdce0] bg-[#f7f7f8] px-2 py-0.5 text-[11px] font-semibold text-[#7d7d87]">
                        {formatCOP(0)}
                      </span>
                    ) : (
                      <span
                        className={
                          v > 0
                            ? 'inline-flex min-w-[4rem] justify-end rounded-full border border-[#f4c678] bg-[#fff6e3] px-2 py-0.5 text-[11px] font-semibold text-[#b57218]'
                            : 'inline-flex min-w-[4rem] justify-end rounded-full border border-[#f5baba] bg-[#ffeeed] px-2 py-0.5 text-[11px] font-semibold text-[#b82626]'
                        }
                      >
                        {signedCOP(v)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-t-2 border-[#3a71f7] bg-[#eff1ff]">
            <div className="px-3 py-3 text-[11px] font-bold text-[#3a71f7]">TOTALES</div>
            <div className="px-3 py-3 border-l border-[#c5d3f8] text-[13px] font-bold tabular-nums text-[#0f0f12]">
              {formatCOP(advisorTotal)}
            </div>
            <div className="px-3 py-3 border-l border-[#c5d3f8] text-[13px] font-bold tabular-nums text-[#0f0f12]">
              {formatCOP(adminDraftTotal)}
            </div>
            <div className="px-3 py-3 border-l border-[#c5d3f8] flex items-center">
              <span
                className={
                  varianceDraft === 0
                    ? 'inline-flex rounded-full border border-[#dcdce0] bg-[#f7f7f8] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#7d7d87]'
                    : varianceDraft > 0
                      ? 'inline-flex rounded-full border border-[#f4c678] bg-[#fff6e3] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#b57218]'
                      : 'inline-flex rounded-full border border-[#f5baba] bg-[#ffeeed] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#b82626]'
                }
              >
                {signedCOP(varianceDraft)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminCashCloseActualsSection;
