import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { serviceOrderService, ServiceOrder, UpdateServiceOrderData } from '@/services/serviceOrderService';
import { useToast } from '@/hooks/use-toast';

const EditServiceOrder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<UpdateServiceOrderData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!id) throw new Error('ID inválido');
        const data = await serviceOrderService.getServiceOrder(Number(id));
        setOrder(data);
        setForm({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          service_type: data.service_type,
          problem_description: data.problem_description,
          estimated_cost: data.estimated_cost,
          deadline: data.deadline,
          priority: data.priority,
          notes: data.notes,
        });
      } catch (e) {
        toast({ title: 'Error', description: 'No se pudo cargar la orden', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, toast]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID inválido');
      return serviceOrderService.updateServiceOrder(Number(id), form);
    },
    onSuccess: () => {
      toast({ title: 'Éxito', description: 'Orden actualizada correctamente' });
      navigate(`/admin/service-orders/${id}`);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo actualizar la orden', variant: 'destructive' });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'estimated_cost' ? Number(value) : value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Editar Orden de Arreglo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de servicio</Label>
            <Input name="service_type" value={form.service_type || ''} onChange={handleChange} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Input name="customer_name" value={form.customer_name || ''} onChange={handleChange} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input name="customer_phone" value={form.customer_phone || ''} onChange={handleChange} />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="customer_email" value={form.customer_email || ''} onChange={handleChange} />
          </div>
          <div>
            <Label>Fecha límite</Label>
            <DatePicker
              value={form.deadline || ''}
              onChange={(d) => setForm(prev => ({ ...prev, deadline: d ? d.toISOString().split('T')[0] : '' }))}
              placeholder="Seleccionar fecha"
              useInputTrigger
            />
          </div>
          <div>
            <Label>Costo estimado</Label>
            <Input type="number" name="estimated_cost" value={Number(form.estimated_cost || 0)} onChange={handleChange} />
          </div>
          <div>
            <Label>Prioridad</Label>
            <Select value={form.priority || 'medium'} onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}>
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
            <Textarea name="problem_description" value={form.problem_description || ''} onChange={handleChange} rows={4} />
          </div>
          <div className="md:col-span-2">
            <Label>Notas</Label>
            <Textarea name="notes" value={form.notes || ''} onChange={handleChange} rows={3} />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate(`/admin/service-orders/${id}`)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={loading}>Guardar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditServiceOrder;


