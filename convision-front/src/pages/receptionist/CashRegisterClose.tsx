import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import { PAYMENT_METHOD_LABELS, PaymentMethodName } from '@/services/cashRegisterCloseService';
import CashPaymentMethodRow from '@/components/cashClose/CashPaymentMethodRow';
import DenominationCountRow from '@/components/cashClose/DenominationCountRow';
import CashCloseSummary from '@/components/cashClose/CashCloseSummary';
import { useCashClose } from '@/hooks/useCashClose';

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  submitted: { label: 'Enviado', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  approved: { label: 'Aprobado', className: 'bg-green-50 text-green-700 border-green-300' },
};

const CashRegisterClose: React.FC = () => {
  const [closeDate, setCloseDate] = useState<Date>(new Date());

  const {
    paymentMethods, denominations, existingClose,
    isLoading, isSaving,
    handlePaymentChange, handleDenominationChange,
    handleSave, handleSubmit,
    totalRegistered, totalCounted, totalDifference, totalCashCounted,
    isReadOnly,
  } = useCashClose(closeDate);

  const currentStatus = existingClose?.status ?? 'draft';
  const statusConfig = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.draft;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cierre de Caja</h1>
          <p className="text-muted-foreground text-sm">Registra el cierre financiero del día</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          <div className="w-48">
            <DatePicker
              value={closeDate}
              onChange={(d) => d && setCloseDate(d)}
              placeholder="Fecha de cierre"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="payment-methods">
          <TabsList>
            <TabsTrigger value="payment-methods">Medios de Pago</TabsTrigger>
            <TabsTrigger value="cash-count">Conteo de Efectivo</TabsTrigger>
            <TabsTrigger value="summary">Resumen</TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medio de Pago</TableHead>
                  <TableHead>Valor Registrado</TableHead>
                  <TableHead>Valor Contado</TableHead>
                  <TableHead>Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.map((pm) => (
                  <CashPaymentMethodRow
                    key={pm.name}
                    name={pm.name as PaymentMethodName}
                    registeredAmount={pm.registered_amount}
                    countedAmount={pm.counted_amount}
                    onChange={handlePaymentChange}
                    readOnly={isReadOnly}
                  />
                ))}
                <TableRow className="bg-blue-50 font-bold">
                  <TableCell className="text-blue-800">TOTALES</TableCell>
                  <TableCell className="text-blue-800">{formatCOP(totalRegistered)}</TableCell>
                  <TableCell className="text-blue-800">{formatCOP(totalCounted)}</TableCell>
                  <TableCell className={totalDifference < 0 ? 'text-red-600' : 'text-green-700'}>
                    {formatCOP(totalDifference)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {!isReadOnly && (
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar borrador
                </Button>
                <Button
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Cierre
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cash-count" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denominación</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {denominations.map((d) => (
                  <DenominationCountRow
                    key={d.denomination}
                    denomination={d.denomination}
                    quantity={d.quantity}
                    onChange={handleDenominationChange}
                    readOnly={isReadOnly}
                  />
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={2}>Total Efectivo Contado</TableCell>
                  <TableCell className="text-right">{formatCOP(totalCashCounted)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar borrador
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary">
            <CashCloseSummary
              totalRegistered={totalRegistered}
              totalCounted={totalCounted}
              totalDifference={totalDifference}
              status={currentStatus}
            />
            <Table className="mt-6">
              <TableHeader>
                <TableRow>
                  <TableHead>Medio de Pago</TableHead>
                  <TableHead>Valor Registrado</TableHead>
                  <TableHead>Valor Contado</TableHead>
                  <TableHead>Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.map((pm) => (
                  <CashPaymentMethodRow
                    key={pm.name}
                    name={pm.name as PaymentMethodName}
                    registeredAmount={pm.registered_amount}
                    countedAmount={pm.counted_amount}
                    onChange={handlePaymentChange}
                    readOnly
                  />
                ))}
              </TableBody>
            </Table>
            {!isReadOnly && (
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar borrador
                </Button>
                <Button
                  className="bg-green-700 hover:bg-green-800 text-white"
                  onClick={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Cierre
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default CashRegisterClose;
