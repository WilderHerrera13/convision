import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supplierService } from '@/services/supplierService';
import { serviceOrderService, CreateServiceOrderData } from '@/services/serviceOrderService';
import { useToast } from '@/hooks/use-toast';

const NewServiceOrder: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => supplierService.getAllSuppliers(),
  });

  const [form, setForm] = useState<CreateServiceOrderData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_type: '',
    problem_description: '',
    estimated_cost: 0,
    deadline: '',
    priority: 'medium',
    notes: '',
  } as any);

  const [supplierId, setSupplierId] = useState<string>('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, supplier_id: Number(supplierId) };
      return serviceOrderService.createServiceOrder(payload);
    },
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Orden creada correctamente' });
      navigate('/admin/service-orders');
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear la orden', variant: 'destructive' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'estimated_cost' ? Number(value) : value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Orden de Arreglo</h1>
          <p className="text-muted-foreground">Registra una reparación para monturas o lentes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Proveedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de servicio</Label>
            <Input name="service_type" value={form.service_type} onChange={handleChange} placeholder="Ej: Reparación de montura" />
          </div>

          <div>
            <Label>Cliente</Label>
            <Input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Nombre del cliente" />
          </div>

          <div>
            <Label>Teléfono</Label>
            <Input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="Teléfono" />
          </div>

          <div>
            <Label>Email</Label>
            <Input name="customer_email" value={form.customer_email || ''} onChange={handleChange} placeholder="Email" />
          </div>

          <div>
            <Label>Fecha límite</Label>
            <DatePicker
              value={form.deadline}
              onChange={(d) => setForm(prev => ({ ...prev, deadline: d ? d.toISOString().split('T')[0] : '' }))}
              placeholder="Seleccionar fecha"
              useInputTrigger
            />
          </div>

          <div>
            <Label>Costo estimado</Label>
            <Input type="number" name="estimated_cost" value={form.estimated_cost} onChange={handleChange} />
          </div>

          <div>
            <Label>Prioridad</Label>
            <Select value={form.priority} onValueChange={(v) => setForm(prev => ({ ...prev, priority: v as any }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Descripción del problema</Label>
            <Textarea name="problem_description" value={form.problem_description} onChange={handleChange} rows={4} />
          </div>

          <div className="md:col-span-2">
            <Label>Notas</Label>
            <Textarea name="notes" value={form.notes || ''} onChange={handleChange} rows={3} />
          </div>

          <div className="md:col-span-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate('/admin/service-orders')}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!supplierId || !form.service_type || !form.customer_name || !form.customer_phone}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewServiceOrder;


