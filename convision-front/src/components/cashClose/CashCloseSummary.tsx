import React from 'react';

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const STATUS_CONFIG: Record<string, { label: string; description: string }> = {
  draft: {
    label: 'Borrador',
    description: 'Este cierre aún no ha sido enviado.',
  },
  submitted: {
    label: 'Pendiente',
    description:
      'El administrador aún no ha validado este cierre. Solo verás el resultado cuando sea aprobado.',
  },
  approved: {
    label: 'Aprobado',
    description: 'Este cierre fue validado y aprobado por administración.',
  },
};

interface Props {
  totalCounted: number;
  totalCashCounted: number;
  status: string;
  showStatusRow?: boolean;
}

const CashCloseSummary: React.FC<Props> = ({
  totalCounted,
  status,
}) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-xl border-[1.5px] border-[#a3d9b8] bg-[#ebf5ef] shadow-[0_4px_16px_rgba(34,139,82,0.12)]">
        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-[10px] bg-[#228b52]" />
        <div className="px-4 py-5 pl-5">
          <p className="text-[11px] font-normal text-[#7d7d87]">Total Contado</p>
          <p className="mt-1 text-[28px] font-bold leading-tight text-[#228b52]">
            {formatCOP(totalCounted)}
          </p>
          <p className="mt-3 text-[11px] font-normal text-[#7d7d87]">Tu conteo físico de caja</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border-[1.5px] border-[#b7a3f8] bg-[#f1ebff]">
        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-[10px] bg-[#8753ef]" />
        <div className="px-4 py-5 pl-5">
          <p className="text-[11px] font-normal text-[#7d7d87]">Estado del cruce</p>
          <p className="mt-1 text-[22px] font-bold leading-tight text-[#8753ef]">{config.label}</p>
          <p className="mt-3 text-[11px] font-normal text-[#7d7d87]">{config.description}</p>
        </div>
      </div>
    </div>
  );
};

export default CashCloseSummary;
