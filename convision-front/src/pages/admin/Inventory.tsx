import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Package, MapPin, Truck } from 'lucide-react';
import WarehouseManagement from '@/components/inventory/WarehouseManagement';
import LocationManagement from '@/components/inventory/LocationManagement';
import InventoryStock from '@/components/inventory/InventoryStock';
import InventoryTransfers from '@/components/inventory/InventoryTransfers';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stock');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventario</h1>
      </div>
      
      <Tabs 
        defaultValue="stock" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Stock</span>
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            <span>Almacenes</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Ubicaciones</span>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Transferencias</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock de Lentes</CardTitle>
              <CardDescription>
                Administra el stock de lentes en todos los almacenes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryStock />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Almacenes</CardTitle>
              <CardDescription>
                Crea y administra almacenes para tu inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WarehouseManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Ubicaciones</CardTitle>
              <CardDescription>
                Administra las ubicaciones dentro de tus almacenes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transferencias de Inventario</CardTitle>
              <CardDescription>
                Gestiona movimientos de lentes entre ubicaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryTransfers />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory; 