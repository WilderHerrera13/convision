import React from 'react';
import {
  RECEPCIONES_DINERO_META,
  RecepcionesDinero,
  sumRecepcionesDinero,
} from '@/services/dailyActivityReportService';
import { formatCOP } from '@/lib/formatMoney';

type Props = {
  recepciones: RecepcionesDinero;
  variant?: 'default' | 'compact';
};

const DailyReportRecepcionesSection: React.FC<Props> = ({ recepciones, variant = 'default' }) => {
  const total = sumRecepcionesDinero(recepciones);
  const rows = RECEPCIONES_DINERO_META.filter(({ key }) => (Number(recepciones[key]) || 0) > 0);

  return (
    <div
      className={
        variant === 'compact'
          ? 'rounded-lg border border-[#e5e5e9] bg-white p-4'
          : 'overflow-hidden rounded-lg border border-[#e5e5e9] bg-white p-6 pt-0'
      }
    >
      <div
        className={
          variant === 'compact'
            ? 'mb-3 border-b border-[#e5e5e9] pb-2'
            : '-mx-6 mb-4 border-b border-[#f4c678] bg-[#fff6e3] px-4 py-3'
        }
      >
        <p
          className={
            variant === 'compact'
              ? 'text-[12px] font-semibold text-[#0f0f12]'
              : 'text-[13px] font-semibold text-[#b57218]'
          }
        >
          Dinero recibido (registro rápido)
        </p>
      </div>
      <div className={variant === 'compact' ? 'space-y-2' : 'space-y-3'}>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[#dcdce0] bg-[#fafafa] px-3 py-2">
          <span className="text-[12px] font-semibold text-[#0f0f12]">Total</span>
          <span className="text-[14px] font-semibold tabular-nums text-[#0f0f12]">{formatCOP(total)}</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-[12px] text-[#7d7d87]">
            Aún no hay montos por canal. Úsalos desde Registro rápido de atención.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <p className="text-[11px] font-medium text-[#7d7d87]">{label}</p>
                <div className="flex h-[30px] items-center rounded-md border border-[#dcdce0] bg-white px-2 text-[12px] tabular-nums text-[#0f0f12]">
                  {formatCOP(Number(recepciones[key]) || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReportRecepcionesSection;
