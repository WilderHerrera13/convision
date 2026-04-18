import React from 'react';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import DenominationCountRow from '@/components/cashClose/DenominationCountRow';
import type { DenominationState } from '@/hooks/useCashClose';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

interface Props {
  denominations: DenominationState[];
  handleDenominationChange: (denomination: number, quantity: number) => void;
  isReadOnly: boolean;
  totalCashCounted: number;
}

const AdvisorCashCloseCashPanel: React.FC<Props> = ({
  denominations,
  handleDenominationChange,
  isReadOnly,
  totalCashCounted,
}) => (
    <div className="space-y-4">
      <Alert className="border-[#c5d3f8] bg-[#eff1ff] text-[#3a71f7]" role="note">
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        <AlertDescription className="text-[13px] font-medium text-[#3a71f7]">
          Ingresa la cantidad de cada denominación. El subtotal se calcula automáticamente.
        </AlertDescription>
      </Alert>

      <h2 className="text-[14px] font-semibold text-foreground">Conteo de Efectivo</h2>

      <Card className="overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-[#f7f7f8] hover:bg-[#f7f7f8]">
              <TableHead className="text-[11px] font-semibold text-[#7d7d87]">Denominación</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#7d7d87]">Cantidad</TableHead>
              <TableHead className="text-right text-[11px] font-semibold text-[#7d7d87]">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {denominations.map((d, i) => (
              <DenominationCountRow
                key={d.denomination}
                denomination={d.denomination}
                quantity={d.quantity}
                onChange={handleDenominationChange}
                readOnly={isReadOnly}
                stripe={i % 2 === 1}
              />
            ))}
            <TableRow className="border-t-2 border-[rgba(58,113,247,0.3)] bg-[#eff1ff] hover:bg-[#eff1ff]">
              <TableCell colSpan={2} className="py-4 text-[12px] font-bold uppercase tracking-wide text-[#3a71f7]">
                TOTAL EFECTIVO CONTADO
              </TableCell>
              <TableCell className="py-4 text-right">
                <span className="inline-flex rounded-lg border-2 border-[#3a71f7] bg-white px-4 py-2 text-[18px] font-bold text-[#3a71f7] shadow-[0_2px_12px_rgba(58,113,247,0.2)]">
                  {formatCOP(totalCashCounted)}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
);

export default AdvisorCashCloseCashPanel;
