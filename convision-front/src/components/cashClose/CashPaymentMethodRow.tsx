import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { COPMoneyInput } from '@/components/ui/cop-money-input';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PaymentMethodName } from '@/services/cashRegisterCloseService';

interface Props {
  name: PaymentMethodName;
  countedAmount: number;
  onChange: (name: string, value: number) => void;
  readOnly?: boolean;
}

const CashPaymentMethodRow: React.FC<Props> = ({
  name,
  countedAmount,
  onChange,
  readOnly,
}) => (
  <TableRow className="hover:bg-muted/40">
    <TableCell>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b0b0bc]" aria-hidden />
        <span className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[name]}</span>
      </div>
    </TableCell>
    <TableCell>
      {readOnly ? (
        <span className="text-sm font-medium tabular-nums text-[#7d7d87]">
          {formatCurrency(countedAmount, 'COP', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      ) : (
        <COPMoneyInput
          value={countedAmount}
          onChange={(v) => onChange(name, v)}
          className="h-[30px] w-full max-w-[256px] border-[#dcdce0] text-[13px] focus-visible:border-[#3a71f7] focus-visible:ring-[#3a71f7]/20"
        />
      )}
    </TableCell>
  </TableRow>
);

export default CashPaymentMethodRow;
