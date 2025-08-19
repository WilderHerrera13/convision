import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Grid,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Box,
  Card,
  CardContent,
  FormControl as MuiFormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import { useToast } from '@/components/ui/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saleService, CreateSaleRequest, SaleResponse } from '@/services/saleService';
import { laboratoryService } from '@/services/laboratoryService';

interface Laboratory {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
}

const saleSchema = z.object({
  patient_id: z.number(),
  order_id: z.number().optional(),
  appointment_id: z.number().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional(),
  laboratory_id: z.number().optional(),
  laboratory_notes: z.string().optional(),
  payments: z.array(z.object({
    payment_method_id: z.number(),
    amount: z.number().min(0.01),
    reference_number: z.string().optional(),
    payment_date: z.string(),
    notes: z.string().optional()
  })).optional()
});

type FormValues = z.infer<typeof saleSchema>;

const NewSale: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      patient_id: 0,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      payments: []
    }
  });

  useEffect(() => {
    const fetchLaboratories = async () => {
      try {
        const response = await laboratoryService.getLaboratories();
        setLaboratories(response.data);
      } catch (error) {
        console.error('Error fetching laboratories:', error);
      }
    };

    fetchLaboratories();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await saleService.createSale(values as CreateSaleRequest);
      
      toast({
        title: 'Venta creada',
        description: 'La venta ha sido creada exitosamente.',
        variant: 'default'
      });
      
      if (response.laboratory_order) {
        toast({
          title: 'Orden de laboratorio creada',
          description: 'Se ha creado una orden de laboratorio automáticamente.',
          variant: 'default'
        });
      }
      
      navigate('/admin/sales');
      
    } catch (error) {
      console.error('Error creating sale:', error);
      setError('No se pudo crear la venta. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && <Alert severity="error">{error}</Alert>}
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información de la Venta
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="laboratory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Laboratorio</FormLabel>
                      <FormControl>
                        <Select
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>Seleccione un laboratorio</em>
                          </MenuItem>
                          {laboratories.map((lab) => (
                            <MenuItem key={lab.id} value={lab.id}>
                              {lab.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <FormField
                  control={form.control}
                  name="laboratory_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas para el Laboratorio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Notas adicionales para la orden de laboratorio"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impuesto</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descuento</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormField
                  control={form.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Notas adicionales sobre la venta"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/sales')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Crear Venta
          </Button>
        </Box>
      </form>
    </Form>
  );
};

export default NewSale; 