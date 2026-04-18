import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PaymentMethodName } from '@/services/cashRegisterCloseService';
import CashPaymentMethodRow from '@/components/cashClose/CashPaymentMethodRow';
import CashCloseSummary from '@/components/cashClose/CashCloseSummary';
import type { PaymentMethodState } from '@/hooks/useCashClose';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

interface Props {
  paymentMethods: PaymentMethodState[];
  totalCounted: number;
  totalCashCounted: number;
  currentStatus: string;
  advisorNotes: string;
}

const AdvisorCashCloseReviewPanel: React.FC<Props> = ({
  paymentMethods,
  totalCounted,
  totalCashCounted,
  currentStatus,
  advisorNotes,
}) => (
  <div className="space-y-6">
    <CashCloseSummary
      totalCounted={totalCounted}
      totalCashCounted={totalCashCounted}
      status={currentStatus}
      showStatusRow={false}
    />

    {advisorNotes.trim() !== '' && (
      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        <Label className="text-[12px] font-semibold text-muted-foreground">Observaciones</Label>
        <p className="whitespace-pre-wrap text-sm text-foreground">{advisorNotes}</p>
      </div>
    )}

    <div className="space-y-2">
      <h2 className="text-[13px] font-semibold text-[#7d7d87]">Desglose por medio de pago</h2>
      <Card className="overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-[#f7f7f8] hover:bg-[#f7f7f8]">
              <TableHead className="text-[11px] font-semibold text-[#52525c]">Medio de Pago</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#52525c]">Valor Contado · Caja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((pm) => (
              <CashPaymentMethodRow
                key={pm.name}
                name={pm.name as PaymentMethodName}
                countedAmount={pm.counted_amount}
                onChange={() => {}}
                readOnly
              />
            ))}
            <TableRow className="border-t border-[#c5d3f8] bg-[#eff1ff] hover:bg-[#eff1ff]">
              <TableCell className="py-3 text-[11px] font-bold uppercase tracking-wide text-[#3a71f7]">TOTALES</TableCell>
              <TableCell className="py-3 text-[13px] font-bold text-[#0f0f12]">{formatCOP(totalCounted)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </div>
);

export default AdvisorCashCloseReviewPanel;
