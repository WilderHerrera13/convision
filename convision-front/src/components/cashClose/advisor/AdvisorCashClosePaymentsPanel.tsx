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
import { PaymentMethodName } from '@/services/cashRegisterCloseService';
import CashPaymentMethodRow from '@/components/cashClose/CashPaymentMethodRow';
import type { PaymentMethodState } from '@/hooks/useCashClose';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

interface Props {
  paymentMethods: PaymentMethodState[];
  handlePaymentChange: (name: string, value: number) => void;
  isReadOnly: boolean;
  totalCounted: number;
}

const AdvisorCashClosePaymentsPanel: React.FC<Props> = ({
  paymentMethods,
  handlePaymentChange,
  isReadOnly,
  totalCounted,
}) => (
  <div className="space-y-4">
    <Alert className="border-[#c5d3f8] bg-[#eff1ff] text-[#3a71f7]" role="note">
      <Info className="h-4 w-4 shrink-0" aria-hidden />
      <AlertDescription className="text-[13px] font-medium text-[#3a71f7]">
        El efectivo se toma del arqueo por denominación (panel izquierdo). Aquí registra solo los demás medios
        de pago.
      </AlertDescription>
    </Alert>

    <Card className="overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-[#f7f7f8] hover:bg-[#f7f7f8]">
            <TableHead className="text-[11px] font-semibold text-[#52525c]">
              Medio de Pago
            </TableHead>
            <TableHead className="text-[11px] font-semibold text-[#52525c]">
              Valor Contado · Caja
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentMethods
            .filter((pm) => pm.name !== 'efectivo')
            .map((pm) => (
              <CashPaymentMethodRow
                key={pm.name}
                name={pm.name as PaymentMethodName}
                countedAmount={pm.counted_amount}
                onChange={handlePaymentChange}
                readOnly={isReadOnly}
              />
            ))}
          <TableRow className="border-t border-[#c5d3f8] bg-[#eff1ff] font-bold hover:bg-[#eff1ff]">
            <TableCell className="py-3 text-[11px] font-bold uppercase tracking-wide text-[#3a71f7]">TOTALES</TableCell>
            <TableCell className="py-3 text-[13px] font-bold text-[#0f0f12]">{formatCOP(totalCounted)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  </div>
);

export default AdvisorCashClosePaymentsPanel;
