import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Download, 
  DollarSign,
  User,
  Calendar,
  ClipboardList,
  ShoppingBag
} from 'lucide-react';
import { quoteService, Quote } from '@/services/quoteService';
import { formatCurrency } from '@/lib/utils';

// Badge variants for statuses
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'approved': return 'bg-green-500 hover:bg-green-600';
    case 'rejected': return 'bg-red-500 hover:bg-red-600';
    case 'expired': return 'bg-gray-500 hover:bg-gray-600';
    case 'converted': return 'bg-blue-500 hover:bg-blue-600';
    default: return 'bg-blue-500 hover:bg-blue-600';
  }
};

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchQuoteDetails(parseInt(id));
    }
  }, [id]);

  const fetchQuoteDetails = async (quoteId: number) => {
    setLoading(true);
    try {
      const data = await quoteService.getQuote(quoteId);
      setQuote(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la cotización.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQuote = async () => {
    if (!quote || !quote.pdf_token) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el token para la descarga.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await quoteService.downloadQuotePdfWithToken(
        quote.id, 
        quote.quote_number, 
        quote.pdf_token
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al descargar la cotización.',
        variant: 'destructive'
      });
    }
  };

  const handleConvertToSale = async () => {
    if (!quote) return;
    
    try {
      const response = await quoteService.convertToSale(quote.id);
      toast({
        title: 'Cotización convertida',
        description: 'La cotización ha sido convertida a venta exitosamente.',
      });
      
      // Navigate to sales
      navigate('/receptionist/sales');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo convertir la cotización a venta.',
        variant: 'destructive'
      });
    }
  };

  // Format the status text
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'expired': 'Expirada',
      'converted': 'Convertida'
    };
    return statusMap[status] || status;
  };

  // Check if quote can be converted to sale
  const canConvert = () => {
    if (!quote) return false;
    
    // Only pending or approved quotes can be converted
    if (quote.status !== 'pending' && quote.status !== 'approved') {
      return false;
    }
    
    // Check if quote is expired
    const expDate = new Date(quote.expiration_date);
    const now = new Date();
    if (expDate < now) {
      return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando información de la cotización...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg mb-4">No se encontró la cotización solicitada.</p>
        <Button onClick={() => navigate('/receptionist/quotes')}>
          Volver a Cotizaciones
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/receptionist/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cotización #{quote.quote_number}</h1>
            <p className="text-gray-500">
              Creada el {format(new Date(quote.created_at), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadQuote}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          {canConvert() && (
            <Button onClick={handleConvertToSale}>
              <DollarSign className="h-4 w-4 mr-2" />
              Convertir a Venta
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ClipboardList className="mr-2 h-5 w-5 text-blue-500" />
                Detalles de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center border px-3 py-2 rounded-md">
                  <span className="text-gray-500 mr-2">Estado:</span>
                  <Badge className={getStatusColor(quote.status)}>
                    {getStatusText(quote.status)}
                  </Badge>
                </div>
                <div className="flex items-center border px-3 py-2 rounded-md">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-500 mr-2">Vence:</span>
                  <span>{format(new Date(quote.expiration_date), 'dd/MM/yyyy')}</span>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-sm font-medium text-gray-500">Notas:</h3>
                <p className="text-sm">{quote.notes || "Sin notas adicionales"}</p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h3 className="font-medium">Productos</h3>
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-500">
                        <th className="text-left py-3 font-medium">Lente</th>
                        <th className="text-center py-3 font-medium">Cantidad</th>
                        <th className="text-right py-3 font-medium">Precio Unitario</th>
                        <th className="text-right py-3 font-medium">Descuento</th>
                        <th className="text-right py-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items && quote.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3">
                            <div>
                              <p className="font-medium">{item.lens.identifier}</p>
                              <p className="text-sm text-gray-500">{item.lens.description}</p>
                              <p className="text-xs text-gray-400">{item.lens.brand.name}</p>
                              {item.notes && (
                                <p className="text-xs text-gray-400 italic mt-1">{item.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-3 text-right">{formatCurrency(item.discount)}</td>
                          <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Client information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-500" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.patient && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{quote.patient.first_name} {quote.patient.last_name}</h3>
                    <p className="text-sm text-gray-500">Identificación: {quote.patient.identification}</p>
                    {quote.patient.email && <p className="text-sm text-gray-500">Email: {quote.patient.email}</p>}
                    {quote.patient.phone && <p className="text-sm text-gray-500">Teléfono: {quote.patient.phone}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-blue-500" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA (19%):</span>
                  <span>{formatCurrency(quote.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Descuento:</span>
                  <span>{formatCurrency(quote.discount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span className="text-lg">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetail; 