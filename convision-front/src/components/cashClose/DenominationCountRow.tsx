import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

interface Props {
  denomination: number;
  quantity: number;
  onChange: (denomination: number, quantity: number) => void;
  readOnly?: boolean;
}

const DenominationCountRow: React.FC<Props> = ({
  denomination,
  quantity,
  onChange,
  readOnly,
}) => {
  const subtotal = denomination * quantity;

  return (
    <TableRow>
      <TableCell className="font-medium">{formatCOP(denomination)}</TableCell>
      <TableCell>
        {readOnly ? (
          <span>{quantity}</span>
        ) : (
          <Input
            type="number"
            min={0}
            value={quantity || ''}
            onChange={(e) => onChange(denomination, parseInt(e.target.value) || 0)}
            className="w-28"
            placeholder="0"
          />
        )}
      </TableCell>
      <TableCell className="text-right font-medium">{formatCOP(subtotal)}</TableCell>
    </TableRow>
  );
};

export default DenominationCountRow;
