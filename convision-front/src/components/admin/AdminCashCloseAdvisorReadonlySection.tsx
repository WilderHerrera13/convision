import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethodName,
  type CashClose,
} from '@/services/cashRegisterCloseService';
import { formatCOP } from '@/pages/admin/cashClosesConfig';

interface Props {
  close: CashClose;
}

function AdminCashCloseAdvisorReadonlySection({ close }: Props) {
  const userName = close.user
    ? `${close.user.name} ${close.user.last_name ?? ''}`.trim()
    : 'Asesor';
  const dateLabel = format(new Date(close.close_date + 'T12:00:00'), 'dd/MM/yyyy');
  const paymentRows = close.payment_methods ?? [];

  return (
    <Card className="overflow-hidden rounded-[10px] border-[#e5e5e9] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-2 border-b border-[#dcdce0] bg-[#f7f7f8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0f0f12]">Cierre del Asesor</p>
          <p className="text-xs text-[#7d7d87]">
            Solo lectura — ingresado por {userName} el {dateLabel}
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit shrink-0 border-[#dcdce0] text-[11px] font-normal text-[#7d7d87]"
        >
          Solo lectura
        </Badge>
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_auto] border-b border-[#dcdce0] bg-[#f7f7f8] text-[11px] font-semibold text-[#7d7d87]">
          <div className="px-3 py-2.5">Medio de Pago</div>
          <div className="border-l border-[#dcdce0] px-3 py-2.5 text-right min-w-[10rem]">
            Valor Contado (Asesor)
          </div>
        </div>
        {paymentRows.map((pm, i) => (
          <div
            key={`${pm.name}-${i}`}
            className={`grid grid-cols-[1fr_auto] border-b border-[#dcdce0] text-sm ${i % 2 === 1 ? 'bg-[#f7f7f8]' : 'bg-white'}`}
          >
            <div className="px-3 py-2.5 font-medium text-[#0f0f12]">
              {PAYMENT_METHOD_LABELS[pm.name as PaymentMethodName] ?? pm.name}
            </div>
            <div className="border-l border-[#dcdce0] px-3 py-2.5 text-right text-[#7d7d87]">
              {formatCOP(pm.counted_amount ?? 0)}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto] bg-[#eff1ff] text-[#3a71f7]">
          <div className="border-t border-[#3a71f7] px-3 py-3 text-xs font-bold">TOTAL ASESOR</div>
          <div className="border-l border-[#c5d3f8] border-t border-t-[#3a71f7] px-3 py-3 text-right text-sm font-bold">
            {formatCOP(close.total_counted ?? 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminCashCloseAdvisorReadonlySection;
