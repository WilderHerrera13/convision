import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Package, MapPin, Truck } from 'lucide-react';
import WarehouseManagement from '@/components/inventory/WarehouseManagement';
import LocationManagement from '@/components/inventory/LocationManagement';
import InventoryStock from '@/components/inventory/InventoryStock';
import InventoryTransfers from '@/components/inventory/InventoryTransfers';
import PageLayout from '@/components/layouts/PageLayout';

const TAB_TRIGGER_CLASS =
  'rounded-none border-b-2 border-transparent data-[state=active]:border-[#3a71f7] data-[state=active]:text-[#3a71f7] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#7d7d87] text-[13px] font-medium px-4 py-3 flex items-center gap-2';

const Inventory: React.FC = () => (
  <PageLayout title="Inventario">
    <Tabs defaultValue="stock" className="w-full">
      <TabsList className="h-auto p-0 bg-transparent border-b border-[#e5e5e9] rounded-none w-full justify-start gap-0 mb-4">
        <TabsTrigger value="stock" className={TAB_TRIGGER_CLASS}>
          <Package className="h-4 w-4" />
          Stock
        </TabsTrigger>
        <TabsTrigger value="warehouses" className={TAB_TRIGGER_CLASS}>
          <Warehouse className="h-4 w-4" />
          Almacenes
        </TabsTrigger>
        <TabsTrigger value="locations" className={TAB_TRIGGER_CLASS}>
          <MapPin className="h-4 w-4" />
          Ubicaciones
        </TabsTrigger>
        <TabsTrigger value="transfers" className={TAB_TRIGGER_CLASS}>
          <Truck className="h-4 w-4" />
          Transferencias
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stock"><InventoryStock /></TabsContent>
      <TabsContent value="warehouses"><WarehouseManagement /></TabsContent>
      <TabsContent value="locations"><LocationManagement /></TabsContent>
      <TabsContent value="transfers"><InventoryTransfers /></TabsContent>
    </Tabs>
  </PageLayout>
);

export default Inventory;
