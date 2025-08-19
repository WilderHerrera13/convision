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
  PlusCircle,
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
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  
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

  const handleAddPayment = (partial = false) => {
    if (!sale) return;
    
    setIsPartialPayment(partial);
    const modalTitle = partial ? 'Agregar Abono' : 'Completar Pago';
    
    setPaymentAmount(partial ? '' : sale.balance.toString());
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

    const amount = parseFloat(paymentAmount);
    
    // Check if amount exceeds balance
    if (amount > sale.balance) {
      toast({
        title: 'Error',
        description: 'El monto no puede ser mayor al saldo pendiente.',
        variant: 'destructive'
      });
      return;
    }
    
    const paymentData = {
      payment_method_id: parseInt(paymentMethod),
      amount: amount,
      reference_number: paymentReference || undefined,
      payment_date: paymentDate,
      notes: paymentNotes || undefined
    };
    
    try {
      if (isPartialPayment) {
        await saleService.addPartialPayment(sale.id, paymentData);
        toast({
          title: 'Abono agregado',
          description: 'El abono ha sido agregado exitosamente.',
        });
      } else {
        await saleService.addPayment(sale.id, paymentData);
        toast({
          title: 'Pago agregado',
          description: 'El pago ha sido agregado exitosamente.',
        });
      }
      
      setPaymentModalOpen(false);
      fetchSale();
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo agregar el ${isPartialPayment ? 'abono' : 'pago'}.`,
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando información de venta...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="container py-8">
        <Button onClick={() => navigate('/admin/sales')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Ventas
        </Button>
        
        <div className="mt-8 text-center">
          {loading ? 'Cargando...' : 'No se encontró la información de la venta.'}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin/sales')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Factura: {sale.sale_number}</h1>
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
          {sale.status !== 'cancelled' && sale.balance > 0 && (
            <Button onClick={() => handleAddPayment(false)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Completar Pago
            </Button>
          )}
          {sale.status !== 'cancelled' && sale.balance > 0 && (
            <Button onClick={() => handleAddPayment(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Agregar Abono
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(sale.status)}
                  {getPaymentStatusBadge(sale.payment_status)}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="text-base">{safeDateFormat(sale.created_at, 'dd/MM/yyyy HH:mm')}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Factura No.</p>
                <p className="text-base">{sale.sale_number}</p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div>
              <h3 className="text-lg font-medium mb-3">Cliente</h3>
              {sale.patient && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{sale.patient.first_name} {sale.patient.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{sale.patient.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{sale.patient.phone || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento:</span>
                <span>{formatCurrency(sale.discount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Pagado:</span>
                <span>{formatCurrency(sale.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-semibold">
                <span>Saldo:</span>
                <span>{formatCurrency(sale.balance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="partial-payments">Abonos</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payments">
            <Card>
              <CardContent className="pt-6">
                {sale.payments && sale.payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.payments.map((payment, index) => (
                        <TableRow key={payment.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{safeDateFormat(payment.payment_date)}</TableCell>
                          <TableCell>{payment.payment_method?.name}</TableCell>
                          <TableCell>{payment.reference_number || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="partial-payments">
            <Card>
              <CardContent className="pt-6">
                {sale.partialPayments && sale.partialPayments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.partialPayments.map((payment, index) => (
                        <TableRow key={payment.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{safeDateFormat(payment.payment_date)}</TableCell>
                          <TableCell>{payment.payment_method?.name}</TableCell>
                          <TableCell>{payment.reference_number || '—'}</TableCell>
                          <TableCell>{payment.notes || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay abonos registrados.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notes">
            <Card>
              <CardContent className="pt-6">
                {sale.notes ? (
                  <div className="p-4 bg-muted rounded-md">
                    <p className="whitespace-pre-line">{sale.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay notas para esta venta.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPartialPayment ? 'Agregar Abono' : 'Completar Pago'}</DialogTitle>
            <DialogDescription>
              Venta: {sale.sale_number} | Saldo: {formatCurrency(sale.balance)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Método de pago *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Seleccionar método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
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
            
            <div className="grid gap-2">
              <Label htmlFor="payment-date">Fecha *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="payment-reference">Referencia</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
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
              {isPartialPayment ? 'Agregar Abono' : 'Completar Pago'}
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