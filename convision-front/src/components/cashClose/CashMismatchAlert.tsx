import React from 'react';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

interface Props {
  registered: number;
  counted: number;
}

const CashMismatchAlert: React.FC<Props> = ({ registered, counted }) => {
  const diff = counted - registered;
  const isFaltante = diff < 0;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative overflow-hidden rounded-[10px] border border-[#f5baba] bg-[#ffeeed] shadow-[0_3px_14px_rgba(184,38,38,0.15)]"
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#b82626]" />

      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffd6d6] text-[18px] font-bold text-[#b82626]">
          ⚠
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-[#b82626]">
              El efectivo contado no coincide con el registrado
            </p>
            <span className="shrink-0 rounded-full bg-[#b82626] px-3 py-0.5 text-[10px] font-bold uppercase text-white">
              {isFaltante ? 'FALTA' : 'SOBRA'}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[11px]">
            <span className="text-[#7d7d87]">Registrado (P1):</span>
            <span className="text-[12px] font-bold text-[#b82626]">{formatCOP(registered)}</span>
            <span className="mx-1 text-[#b0b0bc]">·</span>
            <span className="text-[#7d7d87]">Contado:</span>
            <span className="text-[12px] font-bold text-[#b82626]">{formatCOP(counted)}</span>
            <span className="mx-1 text-[#b0b0bc]">·</span>
            <span className="text-[#7d7d87]">Diferencia:</span>
            <span className="text-[12px] font-bold text-[#b82626]">{formatCOP(diff)}</span>
          </div>

          <p className="mt-1 text-[11px] text-[#7d7d87]">
            {isFaltante
              ? 'Revisa las denominaciones — el total es menor al registrado en Medios de Pago.'
              : 'Revisa las denominaciones — el total es mayor al registrado en Medios de Pago.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CashMismatchAlert;
