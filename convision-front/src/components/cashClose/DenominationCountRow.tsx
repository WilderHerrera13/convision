import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  stripe?: boolean;
}

const DenominationCountRow: React.FC<Props> = ({
  denomination,
  quantity,
  onChange,
  readOnly,
  stripe,
}) => {
  const subtotal = denomination * quantity;
  const isHighDenom = denomination >= 500;

  return (
    <TableRow
      className={cn(stripe && 'bg-[#f7f7f8]/80', !stripe && 'bg-background')}
    >
      <TableCell className="align-middle">
        {isHighDenom ? (
          <Badge
            variant="outline"
            className="border-[#c5d3f8] bg-[#eff1ff] px-2.5 py-0.5 text-[13px] font-semibold text-[#3a71f7]"
          >
            {formatCOP(denomination)}
          </Badge>
        ) : (
          <span className="inline-flex rounded-md bg-muted px-2.5 py-1 text-[13px] font-semibold text-muted-foreground">
            {formatCOP(denomination)}
          </span>
        )}
      </TableCell>
      <TableCell>
        {readOnly ? (
          <span className="text-sm font-medium">{quantity}</span>
        ) : (
          <Input
            type="number"
            min={0}
            value={quantity || ''}
            onChange={(e) => onChange(denomination, parseInt(e.target.value, 10) || 0)}
            className="h-8 w-[100px] max-w-full border-[#dcdce0] focus-visible:border-[#3a71f7] focus-visible:ring-[#3a71f7]/20"
            placeholder="0"
          />
        )}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            'text-[13px] font-semibold',
            quantity === 0 ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {formatCOP(subtotal)}
        </span>
      </TableCell>
    </TableRow>
  );
};

export default DenominationCountRow;
