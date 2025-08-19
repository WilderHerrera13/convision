import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Building2, FileText, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { expenseService, type CreateExpenseData } from '@/services/expenseService';
import { supplierService } from '@/services/supplierService';
import { saleService } from '@/services/saleService';
import { formatCurrency } from '@/lib/utils';

const NewExpense: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [concept, setConcept] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [taxExcluded, setTaxExcluded] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<number | undefined>();
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => saleService.getPaymentMethods(),
  });

  const balance = amount - paymentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierId || !invoiceNumber || !concept || !expenseDate || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const expenseData: CreateExpenseData = {
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        concept,
        description: description || undefined,
        expense_date: expenseDate,
        amount,
        payment_amount: paymentAmount || undefined,
        tax_excluded: taxExcluded,
        payment_method_id: paymentMethodId || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      };

      await expenseService.createExpense(expenseData);

      toast({
        title: 'Gasto creado',
        description: 'El gasto ha sido creado exitosamente.',
      });

      navigate('/admin/expenses');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el gasto.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/admin/expenses')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Gasto</h1>
          <p className="text-muted-foreground">
            Crear un nuevo registro de gasto
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="supplier">Proveedor *</Label>
                <Select
                  value={supplierId?.toString()}
                  onValueChange={(value) => setSupplierId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name} {supplier.nit && `- ${supplier.nit}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice-number">Número de Factura *</Label>
                <Input
                  id="invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Número de factura"
                />
              </div>

              <div>
                <Label htmlFor="concept">Concepto *</Label>
                <Input
                  id="concept"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Concepto del gasto"
                />
              </div>

              <div>
                <Label htmlFor="expense-date">Fecha del Gasto *</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción detallada del gasto"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tax-excluded"
                  checked={taxExcluded}
                  onCheckedChange={(checked) => setTaxExcluded(checked as boolean)}
                />
                <Label htmlFor="tax-excluded">Excluir impuestos</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Información Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">Monto Total *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="payment-amount">Monto Pagado</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              {paymentAmount > 0 && (
                <>
                  <div>
                    <Label htmlFor="payment-method">Método de Pago</Label>
                    <Select
                      value={paymentMethodId?.toString()}
                      onValueChange={(value) => setPaymentMethodId(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reference">Referencia de Pago</Label>
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Número de referencia"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monto Total:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto Pagado:</span>
                    <span className="font-medium text-green-600">{formatCurrency(paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Saldo Pendiente:</span>
                    <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/expenses')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Guardando...' : 'Guardar Gasto'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewExpense; 