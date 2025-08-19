import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  ShoppingBag, 
  Search, 
  FileText, 
  Filter,
  Calendar,
  User,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Order, PaginatedOrdersResponse, orderService } from '@/services/orderService';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [featureAvailable, setFeatureAvailable] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
  }>({
    totalPages: 1,
    totalItems: 0,
    currentPage: 1,
    itemsPerPage: 10
  });

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Build filters object
      const filters: Record<string, string> = {};
      
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      if (paymentFilter !== 'all') {
        filters.payment_status = paymentFilter;
      }
      
      const data = await orderService.getOrders(currentPage, pagination.itemsPerPage, filters);
      
      setOrders(data.data);
      setPagination({
        totalPages: data.last_page,
        totalItems: data.total,
        currentPage: data.current_page,
        itemsPerPage: data.per_page
      });
      setFeatureAvailable(true);
    } catch (error) {
      console.error('Error fetching orders:', error);
      
      // Check for specific error types
      const axiosError = error as { response?: { status: number } };
      if (axiosError.response && axiosError.response.status === 404) {
        setFeatureAvailable(false);
        toast({
          variant: 'destructive',
          title: 'Función no disponible',
          description: 'El módulo de órdenes no está disponible en este momento o no está habilitado para su rol.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las órdenes. Intente nuevamente.'
        });
      }
      
      // Set empty orders so the component doesn't stay in loading state
      setOrders([]);
      setPagination({
        totalPages: 1,
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 10
      });
    } finally {
      setLoading(false);
    }
  };

  // Download PDF
  const downloadPdf = async (orderId: number, orderNumber: string) => {
    try {
      await orderService.downloadOrderPdf(orderId, orderNumber);
      
      toast({
        title: 'PDF Descargado',
        description: `El PDF de la orden ${orderNumber} se ha descargado exitosamente.`
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo descargar el PDF. Intente nuevamente.'
      });
    }
  };

  // Download Laboratory Order PDF
  const downloadLabPdf = async (orderId: number, orderNumber: string) => {
    try {
      await orderService.downloadLaboratoryOrderPdf(orderId, orderNumber);
      
      toast({
        title: 'PDF de Laboratorio Descargado',
        description: `El PDF de la orden de laboratorio ${orderNumber} se ha descargado exitosamente.`
      });
    } catch (error) {
      console.error('Error downloading laboratory PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo descargar el PDF de laboratorio. Intente nuevamente.'
      });
    }
  };

  // Format status display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Procesando</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pagada</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Reembolsada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders();
  };

  // Handle filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePaymentFilterChange = (value: string) => {
    setPaymentFilter(value);
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Initialize
  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, paymentFilter]);

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2 p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Órdenes de Venta</h1>
              <p className="text-gray-500 text-sm">
                Gestione y visualice todas las ventas realizadas
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/receptionist/sales/new')}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </div>
        </div>
        
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" /> 
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 col-span-2">
                <Input
                  placeholder="Buscar por número o paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
              
              <div>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="processing">Procesando</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={paymentFilter} onValueChange={handlePaymentFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pagos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Orders Table */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Órdenes
            </CardTitle>
            <CardDescription>
              {pagination.totalItems} órdenes encontradas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !featureAvailable ? (
              <div className="text-center p-12">
                <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Módulo no disponible</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  El módulo de órdenes no está disponible en este momento o no está habilitado para su rol.
                  Por favor contacte al administrador del sistema para más información.
                </p>
                <Button 
                  onClick={() => navigate('/receptionist/dashboard')} 
                  variant="outline"
                  className="mt-4"
                >
                  Volver al Dashboard
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center p-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No hay órdenes</h3>
                <p className="text-gray-500">No se encontraron órdenes con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Laboratorio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.patient.first_name} {order.patient.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {order.patient.identification}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.payment_status)}
                        </TableCell>
                        <TableCell>
                          {order.laboratory ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {order.laboratory.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Ninguno</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${order.total.toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPdf(order.id, order.order_number)}
                              className="h-8 flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden md:inline">Factura</span>
                            </Button>
                            {order.laboratory && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadLabPdf(order.id, order.order_number)}
                                className="h-8 flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden md:inline">Lab</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/receptionist/orders/${order.id}`)}
                              className="h-8 flex items-center gap-1"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="hidden md:inline">Ver</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-gray-500">
                  Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} 
                  - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 
                  {' '}de {pagination.totalItems} resultados
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    Anterior
                  </Button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === pagination.totalPages || 
                      Math.abs(page - pagination.currentPage) <= 1
                    )
                    .map((page, index, array) => {
                      // Add ellipsis
                      if (index > 0 && page - array[index - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <Button variant="outline" size="sm" disabled>
                              ...
                            </Button>
                            <Button
                              key={page}
                              variant={pagination.currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      }
                      
                      return (
                        <Button
                          key={page}
                          variant={pagination.currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderList; 