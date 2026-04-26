import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, FileText, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { formatDateTime12h } from '@/lib/utils';
import { Order, orderService } from '@/services/orderService';
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

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

  const columns: DataTableColumnDef<Order>[] = [
    {
      id: 'order_number',
      header: 'Número',
      type: 'text',
      accessorKey: 'order_number',
    },
    {
      id: 'patient',
      header: 'Cliente',
      type: 'text',
      cell: (order) => (
        <div>
          <div className="font-medium">{order.patient.first_name} {order.patient.last_name}</div>
          <div className="text-xs text-gray-500">ID: {order.patient.identification}</div>
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Fecha',
      type: 'text',
      cell: (order) => formatDateTime12h(order.created_at),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      cell: (order) => getStatusBadge(order.status),
    },
    {
      id: 'payment_status',
      header: 'Pago',
      type: 'text',
      cell: (order) => getStatusBadge(order.payment_status),
    },
    {
      id: 'laboratory',
      header: 'Laboratorio',
      type: 'text',
      cell: (order) => order.laboratory ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{order.laboratory.name}</Badge>
      ) : (
        <span className="text-gray-400 text-sm">Ninguno</span>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      type: 'money',
      accessorKey: 'total',
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      actions: [
        {
          label: 'Factura PDF',
          icon: <Download className="h-4 w-4 mr-2" />,
          onClick: (order: Order) => downloadPdf(order.id, order.order_number),
        },
        {
          label: 'PDF Laboratorio',
          icon: <Download className="h-4 w-4 mr-2 text-blue-500" />,
          onClick: (order: Order) => downloadLabPdf(order.id, order.order_number),
          show: (order: Order) => !!order.laboratory,
        },
        {
          label: 'Ver Detalles',
          icon: <FileText className="h-4 w-4 mr-2" />,
          onClick: (order: Order) => navigate(`/receptionist/orders/${order.id}`),
        },
      ],
    },
  ];

  return (
    <PageLayout
      title="Órdenes de Venta"
      subtitle="Gestione y visualice todas las ventas realizadas"
      actions={
        <Button onClick={() => navigate('/receptionist/sales/new')}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      }
    >
      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[180px]">
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

      <EntityTable<Order>
        columns={columns}
        queryKeyBase="orders"
        fetcher={({ page, per_page, search }) =>
          orderService.getOrders(page, per_page, {
            ...(search ? { search } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(paymentFilter !== 'all' ? { payment_status: paymentFilter } : {}),
          }).then(r => ({ data: r.data, last_page: r.last_page, total: r.total }))
        }
        searchPlaceholder="Buscar por número o paciente..."
        extraFilters={{ statusFilter, paymentFilter }}
        onRowClick={(order) => navigate(`/receptionist/orders/${order.id}`)}
        tableLayout="ledger"
        paginationVariant="figma"
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Órdenes de Venta</span>
            <span className="text-[11px] text-[#7d7d87]">Listado de órdenes</span>
          </div>
        }
        emptyStateNode={<EmptyState variant="default" title="Sin órdenes" description="No hay órdenes de venta registradas." />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />
    </PageLayout>
  );
};

export default OrderList; 