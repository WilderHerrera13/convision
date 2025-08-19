import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  Calculator,
  FileText,
} from 'lucide-react';
import {
  purchaseService,
  UpdatePurchaseData,
} from '@/services/purchaseService';
import { supplierService } from '@/services/supplierService';
import { Checkbox } from '@/components/ui/checkbox';

interface Supplier {
  id: number;
  name: string;
  nit?: string;
}

const EditPurchase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [taxExcluded, setTaxExcluded] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [retentionAmount, setRetentionAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Data queries
  const { data: purchase, isLoading: loadingPurchase } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchaseService.getPurchase(Number(id)),
    enabled: !!id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  // Update purchase mutation
  const updatePurchaseMutation = useMutation({
    mutationFn: (data: UpdatePurchaseData) => purchaseService.updatePurchase(Number(id), data),
    onSuccess: (updatedPurchase) => {
      toast({
        title: 'Compra actualizada',
        description: `Compra ${updatedPurchase.invoice_number} actualizada exitosamente.`,
      });
      navigate(`/admin/purchases/${id}`);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar la compra.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Load purchase data when available
  useEffect(() => {
    if (purchase) {
      setSupplierId(purchase.supplier_id);
      setPurchaseDate(purchase.purchase_date);
      setInvoiceNumber(purchase.invoice_number);
      setConcept(purchase.concept);
      setNotes(purchase.notes || '');
      setPaymentDueDate(purchase.payment_due_date || '');
      setTaxExcluded(purchase.tax_excluded);
      setSubtotal(purchase.subtotal);
      setTaxAmount(purchase.tax_amount);
      setRetentionAmount(purchase.retention_amount);
      setTotalAmount(purchase.total_amount);
    }
  }, [purchase]);

  // Calculate totals when relevant fields change
  useEffect(() => {
    const calculatedTaxAmount = taxExcluded ? 0 : Math.round(subtotal * 0.19 * 100) / 100;
    const calculatedTotal = subtotal + calculatedTaxAmount - retentionAmount;

    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedTotal);
  }, [subtotal, taxExcluded, retentionAmount]);

  // Submit the updated purchase
  const handleSubmit = () => {
    if (!supplierId || !invoiceNumber || !concept) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos obligatorios.',
        variant: 'destructive',
      });
      return;
    }

    const purchaseData: UpdatePurchaseData = {
      supplier_id: supplierId,
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber,
      concept,
      subtotal,
      tax_amount: taxAmount,
      retention_amount: retentionAmount,
      total_amount: totalAmount,
      tax_excluded: taxExcluded,
      notes,
      payment_due_date: paymentDueDate || undefined,
    };

    updatePurchaseMutation.mutate(purchaseData);
  };

  if (loadingPurchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando datos de la compra...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">No se pudo cargar la compra</p>
          <Button variant="outline" onClick={() => navigate('/admin/purchases')} className="mt-2">
            Volver a Compras
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/admin/purchases/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Compra</h1>
            <p className="text-muted-foreground">
              Factura N° {purchase.invoice_number}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updatePurchaseMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updatePurchaseMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
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
              <Label htmlFor="subtotal">Subtotal *</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(Number(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="tax-amount">Impuestos</Label>
              <Input
                id="tax-amount"
                type="number"
                step="0.01"
                value={taxAmount}
                readOnly={!taxExcluded}
                onChange={(e) => taxExcluded && setTaxAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
                className={!taxExcluded ? 'bg-muted' : ''}
              />
              {!taxExcluded && (
                <p className="text-xs text-muted-foreground mt-1">
                  Calculado automáticamente (19% del subtotal)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="retention">Retención</Label>
              <Input
                id="retention"
                type="number"
                step="0.01"
                value={retentionAmount}
                onChange={(e) => setRetentionAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Total</Label>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagado:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(purchase.payment_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(totalAmount - purchase.payment_amount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notice about items and payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">Nota sobre ítems y pagos</h4>
              <p className="text-sm text-blue-700 mt-1">
                Esta página permite editar la información básica de la compra. 
                Para gestionar ítems y pagos, utilice las funciones específicas desde la vista de detalle.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPurchase; 