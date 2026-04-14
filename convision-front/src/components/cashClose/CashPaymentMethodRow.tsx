import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PAYMENT_METHOD_LABELS, PaymentMethodName } from '@/services/cashRegisterCloseService';

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

interface Props {
  name: PaymentMethodName;
  registeredAmount: number;
  countedAmount: number;
  onChange: (name: string, field: 'registered_amount' | 'counted_amount', value: number) => void;
  readOnly?: boolean;
}

const CashPaymentMethodRow: React.FC<Props> = ({
  name,
  registeredAmount,
  countedAmount,
  onChange,
  readOnly,
}) => {
  const difference = registeredAmount - countedAmount;
  const isNegative = difference < 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {PAYMENT_METHOD_LABELS[name]}
      </TableCell>
      <TableCell>
        {readOnly ? (
          <span>{formatCOP(registeredAmount)}</span>
        ) : (
          <Input
            type="number"
            min={0}
            value={registeredAmount || ''}
            onChange={(e) => onChange(name, 'registered_amount', parseFloat(e.target.value) || 0)}
            className="w-32"
            placeholder="0"
          />
        )}
      </TableCell>
      <TableCell>
        {readOnly ? (
          <span>{formatCOP(countedAmount)}</span>
        ) : (
          <Input
            type="number"
            min={0}
            value={countedAmount || ''}
            onChange={(e) => onChange(name, 'counted_amount', parseFloat(e.target.value) || 0)}
            className="w-32"
            placeholder="0"
          />
        )}
      </TableCell>
      <TableCell className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-700'}`}>
        {isNegative
          ? `↓ -${formatCOP(Math.abs(difference))}`
          : `→ ${formatCOP(difference)}`}
      </TableCell>
    </TableRow>
  );
};

export default CashPaymentMethodRow;
