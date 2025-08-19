import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Tag,
  Folder,
  Users,
  TrendingUp,
  ShoppingCart,
  Eye,
  Plus,
  BarChart3,
} from 'lucide-react';
import { productService } from '@/services/productService';
import { brandService } from '@/services/brandService';
import { categoryService } from '@/services/categoryService';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: productsStats } = useQuery({
    queryKey: ['admin-products-stats'],
    queryFn: () => productService.getProducts({ per_page: 1 }),
  });

  const { data: brandsStats } = useQuery({
    queryKey: ['admin-brands-stats'],
    queryFn: () => brandService.getBrands({ per_page: 1 }),
  });

  const { data: categoriesStats } = useQuery({
    queryKey: ['admin-categories-stats'],
    queryFn: () => categoryService.getCategories({ per_page: 1 }),
  });

  const { data: activeCategories } = useQuery({
    queryKey: ['admin-active-categories'],
    queryFn: () => categoryService.getCategories({ is_active: true, per_page: 1 }),
  });

  const adminModules = [
    {
      title: 'Productos',
      description: 'Gestiona el catálogo completo de productos',
      icon: Package,
      path: '/admin/products',
      color: 'bg-blue-500',
      stats: productsStats?.total || 0,
      statsLabel: 'productos registrados',
    },
    {
      title: 'Marcas',
      description: 'Administra las marcas de productos',
      icon: Tag,
      path: '/admin/brands',
      color: 'bg-green-500',
      stats: brandsStats?.total || 0,
      statsLabel: 'marcas disponibles',
    },
    {
      title: 'Categorías',
      description: 'Organiza los productos por categorías',
      icon: Folder,
      path: '/admin/categories',
      color: 'bg-purple-500',
      stats: categoriesStats?.total || 0,
      statsLabel: 'categorías creadas',
      extraStats: activeCategories?.total || 0,
      extraStatsLabel: 'activas',
    },
  ];

  const quickStats = [
    {
      title: 'Total Productos',
      value: productsStats?.total || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Marcas Activas',
      value: brandsStats?.total || 0,
      icon: Tag,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Categorías',
      value: categoriesStats?.total || 0,
      icon: Folder,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Categorías Activas',
      value: activeCategories?.total || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona productos, marcas y categorías del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Dashboard Principal
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module, index) => {
          const IconComponent = module.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${module.color} text-white`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {module.stats} {module.statsLabel}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    {module.extraStats !== undefined && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {module.extraStats} {module.extraStatsLabel}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(module.path)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${module.path}?action=create`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumen del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Productos Totales</span>
              </div>
              <Badge variant="secondary">{productsStats?.total || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-green-600" />
                <span className="font-medium">Marcas Registradas</span>
              </div>
              <Badge variant="secondary">{brandsStats?.total || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Categorías Activas</span>
              </div>
              <Badge variant="secondary">{activeCategories?.total || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate('/admin/products?action=create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Producto
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate('/admin/brands?action=create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Nueva Marca
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate('/admin/categories?action=create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nueva Categoría
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate('/admin/products')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Todos los Productos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Guía de Administración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Gestión de Productos</h4>
              <p className="text-sm text-muted-foreground">
                Administra el catálogo completo de productos, incluyendo precios, 
                descripciones y asociaciones con marcas y categorías.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Control de Marcas</h4>
              <p className="text-sm text-muted-foreground">
                Mantén actualizado el registro de marcas disponibles para 
                asociar con los productos del sistema.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Organización por Categorías</h4>
              <p className="text-sm text-muted-foreground">
                Estructura el catálogo mediante categorías que faciliten 
                la navegación y búsqueda de productos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard; 