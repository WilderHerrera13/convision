import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Calculator,
  ShoppingCart,
  FileText,
  DollarSign,
} from 'lucide-react';
import {
  purchaseService,
  CreatePurchaseData,
  PurchaseItem,
  PurchasePayment,
} from '@/services/purchaseService';
import { supplierService } from '@/services/supplierService';
import { productService } from '@/services/productService';
import { saleService } from '@/services/saleService';
import { Checkbox } from '@/components/ui/checkbox';

interface Supplier {
  id: number;
  name: string;
  nit?: string;
  phone?: string;
  email?: string;
}

interface Product {
  id: number;
  name: string;
  code?: string;
  sale_price?: number;
}

interface PaymentMethod {
  id: number;
  name: string;
  requires_reference: boolean;
}

const NewPurchase: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Purchase form state
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [taxExcluded, setTaxExcluded] = useState(false);

  // Items state
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<PurchaseItem>>({
    product_description: '',
    quantity: 1,
    unit_price: 0,
  });

  // Payments state
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [newPayment, setNewPayment] = useState<Partial<PurchasePayment>>({
    payment_method_id: 1,
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
  });

  // Calculated totals
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [retentionAmount, setRetentionAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [balance, setBalance] = useState(0);

  // Data queries
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => saleService.getPaymentMethods(),
  });

  const products = productsData?.data || [];

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: (data: CreatePurchaseData) => purchaseService.createPurchase(data),
    onSuccess: (purchase) => {
      toast({
        title: 'Compra creada',
        description: `Compra ${purchase.invoice_number} creada exitosamente.`,
      });
      navigate('/admin/purchases');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear la compra.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Calculate totals whenever items or payments change
  useEffect(() => {
    const itemsSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const calculatedTaxAmount = taxExcluded ? 0 : Math.round(itemsSubtotal * 0.19 * 100) / 100;
    const calculatedTotal = itemsSubtotal + calculatedTaxAmount - retentionAmount;
    const calculatedPaymentAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const calculatedBalance = calculatedTotal - calculatedPaymentAmount;

    setSubtotal(itemsSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
    setPaymentAmount(calculatedPaymentAmount);
    setBalance(calculatedBalance);
  }, [items, payments, taxExcluded, retentionAmount]);

  // Add item to the list
  const addItem = () => {
    if (!newItem.product_description || !newItem.quantity || !newItem.unit_price) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos del ítem.',
        variant: 'destructive',
      });
      return;
    }

    const item: PurchaseItem = {
      ...newItem,
      subtotal: (newItem.quantity || 0) * (newItem.unit_price || 0),
      total: (newItem.quantity || 0) * (newItem.unit_price || 0),
    } as PurchaseItem;

    setItems([...items, item]);
    setNewItem({
      product_description: '',
      quantity: 1,
      unit_price: 0,
    });
  };

  // Remove item from the list
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Add payment to the list
  const addPayment = () => {
    if (!newPayment.payment_method_id || !newPayment.amount || !newPayment.payment_date) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos del pago.',
        variant: 'destructive',
      });
      return;
    }

    const payment = { ...newPayment } as PurchasePayment;
    setPayments([...payments, payment]);
    setNewPayment({
      payment_method_id: 1,
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
    });
  };

  // Remove payment from the list
  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Submit the purchase
  const handleSubmit = () => {
    if (!supplierId || !invoiceNumber || !concept || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios y agregue al menos un ítem.',
        variant: 'destructive',
      });
      return;
    }

    // Validar que no se pague más del total
    if (paymentAmount > totalAmount) {
      toast({
        title: 'Error',
        description: `El monto pagado (${formatCurrency(paymentAmount)}) no puede ser mayor al total de la compra (${formatCurrency(totalAmount)}).`,
        variant: 'destructive',
      });
      return;
    }

    const purchaseData: CreatePurchaseData = {
      supplier_id: supplierId,
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber,
      concept,
      subtotal,
      tax_amount: taxAmount,
      retention_amount: retentionAmount,
      total_amount: totalAmount,
      // No enviar payment_amount ni balance - el backend los calculará automáticamente
      tax_excluded: taxExcluded,
      notes,
      payment_due_date: paymentDueDate || undefined,
      items: items.map(item => ({
        product_description: item.product_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal || 0,
        total: item.total || 0,
        notes: item.notes,
      })),
      payments: payments.map(payment => ({
        payment_method_id: payment.payment_method_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        reference: payment.reference,
        notes: payment.notes,
      })),
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/purchases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nueva Compra</h1>
            <p className="text-muted-foreground">
              Registra una nueva compra de proveedor
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={createPurchaseMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {createPurchaseMutation.isPending ? 'Guardando...' : 'Guardar Compra'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Compra
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
                  {suppliers.map((supplier: Supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase-date">Fecha de Compra *</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invoice-number">N° Factura *</Label>
                <Input
                  id="invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Número de factura"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Descripción de la compra"
              />
            </div>

            <div>
              <Label htmlFor="payment-due-date">Fecha de Vencimiento</Label>
              <Input
                id="payment-due-date"
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
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
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen de Totales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos:</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <Label htmlFor="retention">Retención:</Label>
                <Input
                  id="retention"
                  type="number"
                  step="0.01"
                  value={retentionAmount}
                  onChange={(e) => setRetentionAmount(Number(e.target.value) || 0)}
                  className="w-32 text-right"
                />
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Pagos:</span>
                <span className="font-medium">{formatCurrency(paymentAmount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Saldo:</span>
                <span className="font-medium">{formatCurrency(balance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Ítems de la Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="product-description">Descripción</Label>
              <Input
                id="product-description"
                value={newItem.product_description}
                onChange={(e) => setNewItem({ ...newItem, product_description: e.target.value })}
                placeholder="Descripción del producto"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="unit-price">Precio Unitario</Label>
              <Input
                id="unit-price"
                type="number"
                step="0.01"
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Subtotal</Label>
              <Input
                value={formatCurrency((newItem.quantity || 0) * (newItem.unit_price || 0))}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.subtotal || 0)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Payment Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select
                value={newPayment.payment_method_id?.toString()}
                onValueChange={(value) => setNewPayment({ ...newPayment, payment_method_id: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method: PaymentMethod) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-amount">Monto</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="payment-date">Fecha</Label>
              <Input
                id="payment-date"
                type="date"
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment-reference">Referencia</Label>
              <Input
                id="payment-reference"
                value={newPayment.reference || ''}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                placeholder="Número de referencia"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addPayment} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Pago
              </Button>
            </div>
          </div>

          {/* Payments List */}
          {payments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {paymentMethods.find(m => m.id === payment.payment_method_id)?.name}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewPurchase; 