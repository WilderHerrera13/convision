import { AlertTriangle } from 'lucide-react';
import { AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

interface Props {
  advisorTotal: number;
  adminTotal: number;
  variance: number;
  compensatedTotals?: boolean;
}

function formatSignedCOP(v: number) {
  if (v === 0) return formatCOP(0);
  const sign = v > 0 ? '+' : '−';
  return `${sign}${formatCOP(Math.abs(v))}`;
}

const shellClass =
  'flex w-full items-start gap-3 rounded-lg border border-[#f5baba] bg-[#ffeeed] p-4 text-[#b82626] shadow-[0px_3px_14px_0px_rgba(184,38,38,0.15)]';

function AdminCashCloseMismatchAlert({
  advisorTotal,
  adminTotal,
  variance,
  compensatedTotals = false,
}: Props) {
  if (compensatedTotals) {
    return (
      <div role="alert" className={shellClass}>
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-[#b82626]"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <AlertTitle className="mb-0 text-[13px] font-semibold leading-snug text-[#b82626]">
              Hay diferencias por medio de pago aunque el total general coincide
            </AlertTitle>
            <AlertDescription className="text-[#7d7d87]">
              <p className="text-[11px] leading-relaxed">
                Declarado (asesor):{' '}
                <span className="font-bold text-[#b82626]">{formatCOP(advisorTotal)}</span>
                {' · '}
                Real (admin):{' '}
                <span className="font-bold text-[#b82626]">{formatCOP(adminTotal)}</span>
                {' · '}
                Diferencia total:{' '}
                <span className="font-bold text-[#228b52]">{formatCOP(0)}</span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Revisa la tabla de conciliación: las diferencias por medio de pago se compensan entre sí.
              </p>
            </AlertDescription>
          </div>
          <Badge className="h-6 shrink-0 rounded-full bg-[#b57218] px-3 text-[10px] font-bold text-white hover:bg-[#b57218]">
            REVISAR
          </Badge>
        </div>
      </div>
    );
  }

  const abs = Math.abs(variance);
  const detail =
    variance > 0
      ? `El asesor declaró ${formatCOP(abs)} más de lo que registra contabilidad. Revisa la tabla de conciliación por medio de pago.`
      : `Contabilidad registra ${formatCOP(abs)} más de lo declarado por el asesor. Revisa la tabla de conciliación por medio de pago.`;

  return (
    <div role="alert" className={shellClass}>
      <AlertTriangle
        className="mt-0.5 h-5 w-5 shrink-0 text-[#b82626]"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <AlertTitle className="mb-0 text-[13px] font-semibold leading-snug text-[#b82626]">
            El total declarado por el asesor no coincide con el real del administrador
          </AlertTitle>
          <AlertDescription className="text-[#7d7d87]">
            <p className="text-[11px] leading-relaxed">
              <span>Declarado (asesor): </span>
              <span className="font-bold text-[#b82626]">{formatCOP(advisorTotal)}</span>
              <span> · Real (admin): </span>
              <span className="font-bold text-[#b82626]">{formatCOP(adminTotal)}</span>
              <span> · Diferencia: </span>
              <span className="font-bold text-[#b82626]">{formatSignedCOP(variance)}</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">{detail}</p>
          </AlertDescription>
        </div>
        <Badge className="h-6 shrink-0 rounded-full bg-[#b82626] px-3 text-[10px] font-bold text-white hover:bg-[#b82626]">
          {variance > 0 ? 'FALTA' : 'SOBRA'}
        </Badge>
      </div>
    </div>
  );
}

export default AdminCashCloseMismatchAlert;
