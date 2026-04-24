import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  CheckCircle2,
  Clock,
  AlarmClock,
  Banknote,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { saleService, Sale, PaymentMethod } from '@/services/saleService';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency, safeDateFormat } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PDFViewer } from '@/components/ui/pdf-viewer';

const SaleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(safeDateFormat(new Date(), 'yyyy-MM-dd'));
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    fetchSale();
    fetchPaymentMethods();
  }, [id]);

  const fetchSale = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await saleService.getSale(parseInt(id));
      setSale(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la venta.',
        variant: 'destructive'
      });
      navigate('/receptionist/sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const methods = await saleService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleAddPayment = () => {
    if (!sale) return;
    
    setPaymentAmount(sale.balance.toString());
    setPaymentDate(safeDateFormat(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('');
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleDownloadInvoice = async () => {
    if (!sale) return;
    
    try {
      await saleService.downloadSalePdfSecure(sale.id, sale.sale_number);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar la factura.',
        variant: 'destructive'
      });
    }
  };

  const handlePreviewInvoice = async () => {
    if (!sale) return;
    
    try {
      // Get a token for the PDF
      const { token } = await saleService.getPdfToken(sale.id);
      // Generate a preview URL
      const previewUrl = saleService.getSalePdfPreviewUrl(sale.id, token);
      // Set the URL and open the modal
      setPdfPreviewUrl(previewUrl);
      setPdfPreviewOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la vista previa de la factura.',
        variant: 'destructive'
      });
    }
  };

  const submitPayment = async () => {
    if (!sale) return;
    
    if (!paymentMethod || !paymentAmount || !paymentDate) {
      toast({
        title: 'Error',
        description: 'Todos los campos marcados son obligatorios.',
        variant: 'destructive'
      });
      return;
    }
    
    const selectedMethod = paymentMethods.find(pm => pm.id.toString() === paymentMethod);
    
    if (selectedMethod?.requires_reference && !paymentReference) {
      toast({
        title: 'Error',
        description: 'El número de referencia es requerido para este método de pago.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await saleService.addPayment(sale.id, {
        payment_method_id: parseInt(paymentMethod),
        amount: parseFloat(paymentAmount),
        reference_number: paymentReference || undefined,
        payment_date: paymentDate,
        notes: paymentNotes || undefined
      });
      
      toast({
        title: 'Pago agregado',
        description: 'El pago ha sido agregado exitosamente.',
      });
      
      setPaymentModalOpen(false);
      fetchSale();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el pago.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pendiente</Badge>;
      case 'completed':
        return <Badge variant="success">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pendiente</Badge>;
      case 'partial':
        return <Badge variant="info">Parcial</Badge>;
      case 'paid':
        return <Badge variant="success">Pagada</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Reembolsada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Cargando información de la venta...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sale) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2">No se encontró la venta</p>
            <Button onClick={() => navigate('/receptionist/sales')}>Volver a Ventas</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/receptionist/sales')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Detalle de Venta</h1>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex items-center"
            onClick={handlePreviewInvoice}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Factura
          </Button>
          
          {sale.balance > 0 && (
            <Button onClick={handleAddPayment}>
              <DollarSign className="h-4 w-4 mr-2" />
              Agregar Pago
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sale Info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Información de la Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número de Factura</p>
                <p className="text-lg font-semibold">{sale.sale_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                  <p className="text-lg font-semibold">{safeDateFormat(sale.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <div className="mt-1">{getStatusBadge(sale.status)}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado de Pago</p>
                <div className="mt-1">{getPaymentStatusBadge(sale.payment_status)}</div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                <p className="text-lg font-semibold">{formatCurrency(sale.subtotal)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impuesto</p>
                <p className="text-lg font-semibold">{formatCurrency(sale.tax)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descuento</p>
                <p className="text-lg font-semibold">{formatCurrency(sale.discount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{formatCurrency(sale.total)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pagado</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(sale.amount_paid)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo Pendiente</p>
                <p className="text-lg font-semibold text-amber-600">{formatCurrency(sale.balance)}</p>
              </div>
            </div>
            
            {sale.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas</p>
                  <p className="text-base mt-1">{sale.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.patient ? (
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="h-4 w-4 text-muted-foreground mt-1 mr-2" />
                  <div>
                    <p className="font-medium">{sale.patient.first_name} {sale.patient.last_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {sale.patient.identification}</p>
                  </div>
                </div>
                
                {sale.patient.phone && (
                  <div className="flex items-start">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1 mr-2" />
                    <div>
                      <p className="font-medium">{sale.patient.phone}</p>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                    </div>
                  </div>
                )}
                
                {sale.patient.email && (
                  <div className="flex items-start">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1 mr-2" />
                    <div>
                      <p className="font-medium">{sale.patient.email}</p>
                      <p className="text-sm text-muted-foreground">Email</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay información del cliente disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Productos</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unitario</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        No hay productos asociados a esta venta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.payments && sale.payments.length > 0 ? (
                    sale.payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>{safeDateFormat(payment.payment_date)}</TableCell>
                        <TableCell>{payment.payment_method.name}</TableCell>
                        <TableCell>{payment.reference_number || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        No hay pagos registrados para esta venta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Pago</DialogTitle>
            <DialogDescription>
              Venta: {sale.sale_number} | Saldo: {formatCurrency(sale.balance)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Método de Pago *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Seleccionar método de pago" />
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

            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Monto *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={sale.balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            {paymentMethod && paymentMethods.find(pm => pm.id.toString() === paymentMethod)?.requires_reference && (
              <div className="grid gap-2">
                <Label htmlFor="payment-reference">Número de Referencia *</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="payment-date">Fecha de Pago *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-notes">Notas</Label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitPayment}>
              Agregar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Factura</DialogTitle>
            <DialogDescription>
              Previsualización del documento de factura
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(80vh-10rem)]">
            {pdfPreviewUrl && <PDFViewer url={pdfPreviewUrl} height="100%" />}
          </div>
          <DialogFooter>
            <Button onClick={() => setPdfPreviewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaleDetail; 