import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Receipt,
  Users,
  DollarSign,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  Building2,
  CreditCard,
  ArrowUpDown,
  Wrench,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { purchaseService } from '@/services/purchaseService';
import { expenseService } from '@/services/expenseService';
import { supplierService } from '@/services/supplierService';

const PurchasesDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: purchaseStats } = useQuery({
    queryKey: ['purchase-stats'],
    queryFn: () => Promise.resolve({}),
  });

  const { data: expenseStats } = useQuery({
    queryKey: ['expense-stats'],
    queryFn: () => Promise.resolve({}),
  });

  const { data: supplierStats } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: () => Promise.resolve({}),
  });

  const modules = [
    {
      title: 'Gastos',
      description: 'Registrar gastos de proveedores con fecha, concepto, valor, abono y saldo',
      icon: Receipt,
      color: 'bg-blue-500',
      path: '/admin/expenses',
      features: ['Fecha y proveedor', 'Concepto y detalle', 'Valor, abono, saldo', 'IVA checkbox', 'Fuente de pago'],
    },
    {
      title: 'Compras',
      description: 'Registrar compras que afectan inventario con productos, precios e IVA',
      icon: ShoppingCart,
      color: 'bg-green-500',
      path: '/admin/purchases',
      features: ['Lista de productos', 'Tipo, código, cantidad', 'Precio e IVA', 'Actualización automática', 'Método de pago'],
    },
    {
      title: 'Nómina',
      description: 'Registrar pagos de empleados incluyendo salarios, bonos y deducciones',
      icon: UserCheck,
      color: 'bg-purple-500',
      path: '/admin/payrolls',
      features: ['Salarios y bonos', 'Deducciones', 'Cálculo automático', 'Métodos de pago', 'Períodos de pago'],
    },
    {
      title: 'Orden Lab',
      description: 'Enviar órdenes de laboratorio con fechas de entrega, proveedores y precios',
      icon: FileText,
      color: 'bg-orange-500',
      path: '/admin/laboratory-orders',
      features: ['Prescripciones', 'Fechas de entrega', 'Proveedores', 'Precios', 'Seguimiento'],
    },
    {
      title: 'Orden Arreglo',
      description: 'Registrar reparaciones de monturas o lentes con detalles del cliente',
      icon: Wrench,
      color: 'bg-red-500',
      path: '/admin/service-orders',
      features: ['Detalles del cliente', 'Tipo de problema', 'Costo estimado', 'Fecha límite', 'Estado'],
    },
    {
      title: 'Facturar Órdenes',
      description: 'Agrupar y facturar órdenes pendientes de Lab o Arreglo por proveedor',
      icon: FileText,
      color: 'bg-indigo-500',
      path: '/admin/invoice-orders',
      features: ['Agrupación por proveedor', 'Órdenes pendientes', 'Facturación masiva', 'Seguimiento', 'Reportes'],
    },
    {
      title: 'Pagar Cartera',
      description: 'Rastrear pagos aplicados hacia saldos pendientes de proveedores',
      icon: CreditCard,
      color: 'bg-teal-500',
      path: '/admin/supplier-payments',
      features: ['Saldos pendientes', 'Aplicar pagos', 'Historial', 'Conciliación', 'Reportes'],
    },
    {
      title: 'Trasladar Efectivo',
      description: 'Registrar movimientos internos de fondos: origen, destino, monto, razón',
      icon: ArrowUpDown,
      color: 'bg-yellow-500',
      path: '/admin/cash-transfers',
      features: ['Origen y destino', 'Montos', 'Razones', 'Aprobaciones', 'Auditoría'],
    },
    {
      title: 'Estados Laboratorio',
      description: 'Rastrear estado de órdenes de laboratorio con filtros y exportaciones',
      icon: BarChart3,
      color: 'bg-pink-500',
      path: '/admin/laboratory-status',
      features: ['Estados de órdenes', 'Filtros avanzados', 'Exportaciones', 'Seguimiento', 'Alertas'],
    },
  ];

  const stats = [
    {
      title: 'Total Compras',
      value: 0,
      subtitle: formatCurrency(0),
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Total Gastos',
      value: 0,
      subtitle: formatCurrency(0),
      icon: Receipt,
      color: 'text-green-600',
    },
    {
      title: 'Proveedores',
      value: 0,
      subtitle: '0 activos',
      icon: Building2,
      color: 'text-purple-600',
    },
    {
      title: 'Saldo Pendiente',
      value: formatCurrency(0),
      subtitle: 'Por pagar',
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">
            Gestiona las compras y facturas de proveedores
          </p>
        </div>
        <Button onClick={() => navigate('/admin/purchases/new')}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${module.color}`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {module.description}
              </p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Características:
                </p>
                <ul className="text-xs space-y-1">
                  {module.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate(module.path)}
              >
                Acceder
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/expenses/new')}
            >
              <Receipt className="h-6 w-6" />
              Nuevo Gasto
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/purchases/new')}
            >
              <ShoppingCart className="h-6 w-6" />
              Nueva Compra
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/suppliers')}
            >
              <Building2 className="h-6 w-6" />
              Proveedores
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/admin/laboratory-orders/new')}
            >
              <FileText className="h-6 w-6" />
              Orden Lab
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasesDashboard; 