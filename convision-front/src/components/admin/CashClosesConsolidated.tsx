import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth } from 'date-fns';
import { Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import cashRegisterCloseService, {
  type ConsolidatedPayload,
  type ConsolidatedAdvisorRow,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

type RangePreset = 'today' | '7d' | '14d' | 'month' | 'custom';

const PRESETS: { id: RangePreset; label: string; width: string }[] = [
  { id: 'today', label: 'Hoy', width: 'w-[45px]' },
  { id: '7d', label: '7d', width: 'w-[38px]' },
  { id: '14d', label: '14d', width: 'w-[45px]' },
  { id: 'month', label: 'Mes', width: 'w-[45px]' },
  { id: 'custom', label: 'Personalizado', width: 'w-[115px]' },
];

const formatYMD = (d: Date) => format(d, 'yyyy-MM-dd');
const formatDisplay = (d: Date) => format(d, 'dd/MMM/yyyy').toLowerCase();
const pl = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

const computeRange = (preset: RangePreset): { from: Date; to: Date } => {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: subDays(today, 6), to: today };
    case 'month':
      return { from: startOfMonth(today), to: today };
    case '14d':
    case 'custom':
    default:
      return { from: subDays(today, 13), to: today };
  }
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Aprobado', cls: 'bg-[#ebf5ef] text-[#228b52]' },
  submitted: { label: 'Pendiente', cls: 'bg-[#fff6e3] text-[#b57218]' },
  draft: { label: 'Borrador', cls: 'bg-[#f5f5f6] text-[#7d7d87]' },
};

const Money: React.FC<{ value: number; emphasizeNegative?: boolean; bold?: boolean }> = ({
  value,
  emphasizeNegative = true,
  bold,
}) => {
  const isNeg = value < 0;
  const cls = `${emphasizeNegative && isNeg ? 'text-[#b82626]' : 'text-[#0f0f12]'} ${
    bold ? 'font-semibold' : 'font-normal'
  } text-[13px]`;
  const formatted = isNeg ? `-${formatCOP(Math.abs(value))}` : formatCOP(value);
  return <span className={cls}>{formatted}</span>;
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub: string;
  accentColor: string;
  valueColor?: string;
}> = ({ label, value, sub, accentColor, valueColor = '#0f0f12' }) => (
  <div className="relative h-[100px] min-w-0 flex-1 overflow-hidden rounded-[8px] border border-[#e0e0e4] bg-white">
    <div
      className="absolute left-0 top-0 h-full w-[4px] rounded-l-[8px]"
      style={{ backgroundColor: accentColor }}
    />
    <div className="px-[15px] pt-[13px]">
      <p className="text-[11px] font-semibold text-[#7d7d87]">{label}</p>
      <p
        className="mt-[8px] truncate text-[20px] font-semibold leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      <p className="mt-[14px] text-[11px] font-normal text-[#7d7d87]">{sub}</p>
    </div>
  </div>
);

const BreakdownCard: React.FC<{
  label: string;
  count: number;
  pillLabel: string;
  pillCls: string;
  accentColor: string;
  valueColor: string;
  hint: string;
  footer: string;
  isLoading?: boolean;
}> = ({ label, count, pillLabel, pillCls, accentColor, valueColor, hint, footer, isLoading = false }) => (
  <div className="relative h-[108px] flex-1 overflow-hidden rounded-[8px] border border-[#e0e0e4] bg-white">
    <div
      className="absolute left-0 top-0 h-full w-[4px] rounded-l-[8px]"
      style={{ backgroundColor: accentColor }}
    />
    <div
      className={`absolute right-[16px] top-[13px] flex h-[20px] items-center justify-center rounded-full px-[10px] text-[10px] font-semibold ${pillCls}`}
    >
      {pillLabel}
    </div>
    <div className="px-[15px] pt-[15px]">
      <p className="text-[11px] font-semibold text-[#7d7d87]">{label}</p>
      <div className="mt-[6px] flex items-end gap-[16px]">
        <p
          className="text-[28px] font-semibold leading-none"
          style={{ color: valueColor }}
        >
          {isLoading ? '—' : count}
        </p>
        <p className="pb-[4px] text-[11px] text-[#7d7d87]">{isLoading ? '' : hint}</p>
      </div>
      <p className="mt-[10px] text-[12px] text-[#0f0f12]">{isLoading ? '—' : footer}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_LABEL[status] ?? STATUS_LABEL.draft;
  return (
    <span
      className={`inline-flex h-[22px] w-[80px] items-center justify-center rounded-full text-[11px] font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
};

const CashClosesConsolidated: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<RangePreset>('14d');
  const [range, setRange] = useState<{ from: Date; to: Date }>(computeRange('14d'));

  const handlePreset = (id: RangePreset) => {
    setPreset(id);
    if (id !== 'custom') {
      setRange(computeRange(id));
    }
  };

  const handleCustomDate = (field: 'from' | 'to', value: string) => {
    if (!value) return;
    const newDate = new Date(value + 'T00:00:00');
    setRange((prev) => {
      const next = { ...prev, [field]: newDate };
      // ensure from <= to
      if (field === 'from' && newDate > prev.to) return { from: newDate, to: newDate };
      if (field === 'to' && newDate < prev.from) return { from: newDate, to: newDate };
      return next;
    });
  };

  const params = useMemo(
    () => ({
      date_from: formatYMD(range.from),
      date_to: formatYMD(range.to),
    }),
    [range],
  );

  const { data, isLoading } = useQuery<ConsolidatedPayload>({
    queryKey: ['cash-closes-consolidated', params.date_from, params.date_to],
    queryFn: () => cashRegisterCloseService.getConsolidated(params),
  });

  const handleAdvisorClick = (row: ConsolidatedAdvisorRow) => {
    navigate(`/admin/cash-closes/advisor/${row.user_id}`);
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex h-[44px] items-center gap-[10px] rounded-[8px] border border-[#e0e0e4] bg-white px-[15px]">
        <span className="text-[11px] font-semibold text-[#7d7d87]">Rango</span>
        {preset === 'custom' ? (
          <>
            <input
              type="date"
              value={formatYMD(range.from)}
              onChange={(e) => handleCustomDate('from', e.target.value)}
              className="flex h-[32px] w-[145px] items-center rounded-[6px] border border-[#3a71f7] bg-white px-[9px] text-[12px] text-[#0f0f12] focus:outline-none focus:ring-1 focus:ring-[#3a71f7]"
            />
            <span className="text-[12px] text-[#7d7d87]">—</span>
            <input
              type="date"
              value={formatYMD(range.to)}
              onChange={(e) => handleCustomDate('to', e.target.value)}
              className="flex h-[32px] w-[145px] items-center rounded-[6px] border border-[#3a71f7] bg-white px-[9px] text-[12px] text-[#0f0f12] focus:outline-none focus:ring-1 focus:ring-[#3a71f7]"
            />
          </>
        ) : (
          <>
            <div className="flex h-[32px] w-[140px] items-center rounded-[6px] border border-[#e0e0e4] bg-white px-[9px] text-[12px] text-[#0f0f12]">
              {formatDisplay(range.from)}
            </div>
            <span className="text-[12px] text-[#7d7d87]">—</span>
            <div className="flex h-[32px] w-[140px] items-center rounded-[6px] border border-[#e0e0e4] bg-white px-[9px] text-[12px] text-[#0f0f12]">
              {formatDisplay(range.to)}
            </div>
          </>
        )}
        <div className="flex items-center gap-[6px]">
          {PRESETS.map((p) => {
            const active = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePreset(p.id)}
                className={`h-[28px] ${p.width} rounded-full border text-[11px] transition-colors ${
                  active
                    ? 'border-[#3a71f7] bg-[#eff1ff] font-semibold text-[#3a71f7]'
                    : 'border-[#e0e0e4] bg-[#f5f5f6] font-normal text-[#7d7d87] hover:bg-[#ececef]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[11px] text-[#7d7d87]">
          {isLoading
            ? 'Calculando…'
            : data
              ? `${pl(data.kpis.days_in_period, 'día', 'días')} · ${pl(data.kpis.advisors_count, 'asesor', 'asesores')} · ${data.kpis.total_closes} cierres en el período`
              : '—'}
        </div>
      </div>

      <div className="flex gap-[16px]">
        <KpiCard
          label="Cierres del período"
          value={isLoading ? '—' : data?.kpis.total_closes ?? 0}
          sub={
            data
              ? `${pl(data.kpis.days_in_period, 'día', 'días')} · ${pl(data.kpis.advisors_count, 'asesor', 'asesores')}`
              : '—'
          }
          accentColor="#3a71f7"
        />
        <KpiCard
          label="Total declarado"
          value={isLoading ? '—' : formatCOP(data?.kpis.total_declared ?? 0)}
          sub="Suma de los totales del período"
          accentColor="#3a71f7"
        />
        <KpiCard
          label="Efectivo contado"
          value={isLoading ? '—' : formatCOP(data?.kpis.total_counted ?? 0)}
          sub="Sumatoria del conteo físico (conciliado + declarado pendiente)"
          accentColor="#3a71f7"
        />
        <KpiCard
          label="Diferencia neta"
          value={
            isLoading
              ? '—'
              : !data || data.kpis.net_variance === 0
                ? formatCOP(0)
                : data.kpis.net_variance > 0
                  ? `+${formatCOP(data.kpis.net_variance)}`
                  : `-${formatCOP(Math.abs(data.kpis.net_variance))}`
          }
          sub={
            data && data.kpis.net_variance !== 0
              ? `${data.kpis.variance_pct.toFixed(3)}% sobre declarado conciliado`
              : '—'
          }
          accentColor={
            data && data.kpis.net_variance < 0
              ? '#b82626'
              : data && data.kpis.net_variance > 0
                ? '#228b52'
                : '#3a71f7'
          }
          valueColor={
            data && data.kpis.net_variance < 0
              ? '#b82626'
              : data && data.kpis.net_variance > 0
                ? '#228b52'
                : '#0f0f12'
          }
        />
      </div>

      <div className="flex gap-[16px]">
        <BreakdownCard
          label="Aprobados"
          count={data?.breakdown.approved_count ?? 0}
          pillLabel="OK"
          pillCls="bg-[#ebf5ef] text-[#228b52]"
          accentColor="#228b52"
          valueColor="#228b52"
          hint={data ? `${data.breakdown.approved_pct.toFixed(1)}% del período` : ''}
          footer={`${formatCOP(data?.breakdown.approved_total ?? 0)} conciliados`}
          isLoading={isLoading}
        />
        <BreakdownCard
          label="Pendientes de revisión"
          count={data?.breakdown.pending_count ?? 0}
          pillLabel="REVISAR"
          pillCls="bg-[#fff6e3] text-[#b57218]"
          accentColor="#b57218"
          valueColor="#b57218"
          hint="Requieren acción del admin"
          footer={`${formatCOP(data?.breakdown.pending_total ?? 0)} por aprobar`}
          isLoading={isLoading}
        />
        <BreakdownCard
          label="Con diferencia"
          count={data?.breakdown.with_variance_count ?? 0}
          pillLabel="ALERTA"
          pillCls="bg-[#ffeeed] text-[#b82626]"
          accentColor="#b82626"
          valueColor="#b82626"
          hint="Faltante + sobrante"
          footer={`${
            data && data.breakdown.net_variance < 0
              ? `-${formatCOP(Math.abs(data.breakdown.net_variance))}`
              : data && data.breakdown.net_variance > 0
                ? `+${formatCOP(data.breakdown.net_variance)}`
                : formatCOP(0)
          } neto acumulado`}
          isLoading={isLoading}
        />
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[#0f0f12]">Consolidado por asesor</h3>
        <p className="mt-[2px] text-[11px] text-[#7d7d87]">
          Totales agregados de todos los cierres del rango seleccionado
        </p>

        <div className="mt-[16px] overflow-x-auto rounded-[8px] border border-[#e5e5e9] bg-white">
          <div className="min-w-[900px]">
          <div className="grid grid-cols-[minmax(180px,2fr)_70px_130px_130px_110px_130px_110px_70px] items-center gap-[8px] bg-[#f7f7fa] px-[14px] py-[12px] text-[11px] font-semibold text-[#7d7d87]">
            <div>Asesor</div>
            <div>Cierres</div>
            <div>Total declarado</div>
            <div>Efectivo contado</div>
            <div>Diferencia</div>
            <div>(+) Sobra (-) Falta</div>
            <div>Estado</div>
            <div className="text-right">Acciones</div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[48px] w-full" />
              ))}
            </div>
          ) : data && data.advisors.length > 0 ? (
            data.advisors.map((row) => (
              <div
                key={row.user_id}
                className="grid grid-cols-[minmax(180px,2fr)_70px_130px_130px_110px_130px_110px_70px] items-center gap-[8px] border-t border-[#e5e5e9] px-[14px] py-[12px]"
              >
                <div className="flex items-center gap-[10px]">
                  <div className="flex size-[28px] items-center justify-center rounded-full bg-[#eff1ff] text-[10px] font-semibold text-[#3a71f7]">
                    {row.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#0f0f12]">
                      {row.user_name}
                    </span>
                    {row.sede && (
                      <span className="text-[11px] text-[#7d7d87]">{row.sede}</span>
                    )}
                  </div>
                </div>
                <div className="text-[13px] font-semibold text-[#0f0f12]">{row.closes_count}</div>
                <div>
                  <Money value={row.total_declared} emphasizeNegative={false} />
                </div>
                <div>
                  <Money value={row.total_counted} emphasizeNegative={false} />
                </div>
                <div>
                  <Money value={row.variance} bold={row.variance !== 0} />
                </div>
                <div>
                  <Money value={row.sobra_falta} bold={row.sobra_falta !== 0} />
                </div>
                <div>
                  <StatusBadge status={row.latest_status} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-label="Ver"
                    onClick={() => handleAdvisorClick(row)}
                    className="flex size-[32px] items-center justify-center rounded-[6px] border border-[#c5d3f8] bg-[#eff4ff] text-[#3a71f7] hover:bg-[#dce5ff]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="border-t border-[#e5e5e9] py-10 text-center text-[12px] text-[#7d7d87]">
              No hay cierres en el rango seleccionado
            </div>
          )}

          {data && data.advisors.length > 0 && (
            <div className="grid grid-cols-[minmax(180px,2fr)_70px_130px_130px_110px_130px_110px_70px] items-center gap-[8px] border-t border-[#e5e5e9] bg-[#f7f7fa] px-[14px] py-[14px] text-[13px] font-semibold text-[#0f0f12]">
              <div className="text-[#0f0f12]">TOTALES DEL PERÍODO</div>
              <div>{data.totals.closes_count}</div>
              <div>{formatCOP(data.totals.total_declared)}</div>
              <div>{formatCOP(data.totals.total_counted)}</div>
              <div>
                <Money value={data.totals.variance} bold />
              </div>
              <div>
                <Money value={data.totals.sobra_falta} bold />
              </div>
              <div />
              <div />
            </div>
          )}

          <div className="border-t border-[#e5e5e9] bg-white px-[20px] py-[14px] text-[12px] text-[#7d7d87]">
            {data
              ? `Mostrando ${data.advisors.length} de ${data.advisors.length} asesores con actividad en el período`
              : '—'}
          </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[#0f0f12]">
          Detalle de conciliación por cierre
        </h3>
        <p className="mt-[2px] text-[11px] text-[#7d7d87]">
          Cierres del período con diferencia — cruce declarado vs. efectivo contado
        </p>

        <div className="mt-[16px] grid grid-cols-1 gap-[16px] lg:grid-cols-[1fr_368px]">
          <div className="overflow-x-auto rounded-[8px] border border-[#e5e5e9] bg-white">
            <div className="min-w-[700px]">
            <div className="grid grid-cols-[60px_100px_minmax(120px,1fr)_100px_110px_110px_100px_100px] gap-[8px] bg-[#f7f7fa] px-[16px] py-[12px] text-[11px] font-semibold text-[#7d7d87]">
              <div># Cierre</div>
              <div>Fecha</div>
              <div>Asesor</div>
              <div>Estado</div>
              <div>Total declarado</div>
              <div>Efectivo contado</div>
              <div>Diferencia</div>
              <div>(+) Sobra (-) Falta</div>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[36px] w-full" />
                ))}
              </div>
            ) : data && data.reconciliation.length > 0 ? (
              <>
                {data.reconciliation.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[60px_100px_minmax(120px,1fr)_100px_110px_110px_100px_100px] gap-[8px] border-t border-[#f0f0f2] px-[16px] py-[12px]"
                  >
                    <span className="text-[12px] font-semibold text-[#3a71f7]">#{r.id}</span>
                    <span className="text-[12px] text-[#0f0f12]">{r.close_date}</span>
                    <span className="truncate text-[12px] text-[#0f0f12]">{r.user_name}</span>
                    <StatusBadge status={r.status} />
                    <Money value={r.total_declared} emphasizeNegative={false} />
                    <Money value={r.total_counted} emphasizeNegative={false} />
                    <Money value={r.variance} bold={r.variance !== 0} />
                    <Money value={r.sobra_falta} bold={r.sobra_falta !== 0} />
                  </div>
                ))}
                <div className="grid grid-cols-[60px_100px_minmax(120px,1fr)_100px_110px_110px_100px_100px] gap-[8px] border-t border-[#f0f0f2] bg-[#f7f7fa] px-[16px] py-[14px] text-[13px] font-semibold">
                  <span />
                  <span />
                  <span className="text-[#0f0f12]">TOTALES</span>
                  <span />
                  <span className="text-[#0f0f12]">
                    {formatCOP(
                      data.reconciliation.reduce((s, r) => s + r.total_declared, 0),
                    )}
                  </span>
                  <span className="text-[#0f0f12]">
                    {formatCOP(
                      data.reconciliation.reduce((s, r) => s + r.total_counted, 0),
                    )}
                  </span>
                  <Money
                    value={data.reconciliation.reduce((s, r) => s + r.variance, 0)}
                    bold
                  />
                  <Money
                    value={data.reconciliation.reduce((s, r) => s + r.sobra_falta, 0)}
                    bold
                  />
                </div>
              </>
            ) : (
              <div className="border-t border-[#f0f0f2] py-10 text-center text-[12px] text-[#7d7d87]">
                No hay cierres con diferencia en el período
              </div>
            )}
            </div>
          </div>

          <aside className="rounded-[8px] border border-[#3a71f7] bg-[#eff1ff] p-[16px]">
            <h4 className="text-[13px] font-semibold text-[#3a71f7]">Cómo leer este panel</h4>
            <ul className="mt-[16px] space-y-[16px]">
              <li>
                <div className="flex items-start gap-[10px]">
                  <span className="mt-[6px] size-[6px] shrink-0 rounded-full bg-[#3a71f7]" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f0f12]">Diferencia</p>
                    <p className="mt-[4px] text-[11px] text-[#7d7d87]">
                      Efectivo contado menos total declarado. En negativo = falta; en positivo =
                      sobrante.
                    </p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-[10px]">
                  <span className="mt-[6px] size-[6px] shrink-0 rounded-full bg-[#3a71f7]" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f0f12]">(+) Sobra (-) Falta</p>
                    <p className="mt-[4px] text-[11px] text-[#7d7d87]">
                      Valor ajustado por el admin. Positivo = sobra; negativo = falta.
                    </p>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-[10px]">
                  <span className="mt-[6px] size-[6px] shrink-0 rounded-full bg-[#3a71f7]" />
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f0f12]">Rango de fecha</p>
                    <p className="mt-[4px] text-[11px] text-[#7d7d87]">
                      Incluye cierres con fecha de operación dentro del rango — independiente del
                      estado.
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CashClosesConsolidated;
