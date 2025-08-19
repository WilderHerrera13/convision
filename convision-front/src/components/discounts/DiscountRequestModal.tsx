import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, X, Search, Glasses } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification?: string;
  email?: string;
}

interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: number;
}

interface DiscountRequest {
  id: number;
  lens_id: number;
  patient_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  discount_percentage: number;
  original_price: number;
  discounted_price: number;
  reason?: string;
  rejection_reason?: string;
  approved_by?: number;
  expiry_date?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

interface DiscountRequestModalProps {
  lens: Lens | null;
  patient?: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (discount: DiscountRequest) => void;
}

// Form validation schema
const formSchema = z.object({
  lens_id: z.number().nullable().refine(val => val !== null, {
    message: 'Debe seleccionar un lente',
  }),
  patient_id: z.number().optional().nullable(),
  discount_percentage: z.number().min(1, 'El porcentaje mínimo es 1%').max(100, 'El porcentaje máximo es 100%'),
  reason: z.string().min(1, 'Debe proporcionar una razón para el descuento').max(500, 'La razón no debe exceder 500 caracteres'),
  expiry_date: z.date().optional().nullable(),
  is_global: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const DiscountRequestModal: React.FC<DiscountRequestModalProps> = ({
  lens: initialLens,
  patient: initialPatient,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  
  // Patient search states
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient || null);
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  
  // Lens search states
  const [lensSearch, setLensSearch] = useState('');
  const [selectedLens, setSelectedLens] = useState<Lens | null>(initialLens || null);
  const [lensOptions, setLensOptions] = useState<Lens[]>([]);
  const [isSearchingLens, setIsSearchingLens] = useState(false);
  const [showLensResults, setShowLensResults] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lens_id: initialLens?.id || null,
      patient_id: initialPatient?.id,
      discount_percentage: 10,
      reason: '',
      expiry_date: null,
      is_global: false,
    },
  });

  // When lens or initialPatient changes, update the form values
  useEffect(() => {
    if (initialLens) {
      form.setValue('lens_id', initialLens.id);
      setSelectedLens(initialLens);
      setLensSearch(initialLens.identifier);
    }
    if (initialPatient) {
      form.setValue('patient_id', initialPatient.id);
      setSelectedPatient(initialPatient);
      setPatientSearch(`${initialPatient.first_name} ${initialPatient.last_name}`);
    }
  }, [initialLens, initialPatient, form]);

  // Handle patient search
  const handlePatientSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientSearch(value);
    
    if (value.length < 3) {
      setPatientOptions([]);
      setShowPatientResults(false);
      return;
    }
    
    setIsSearchingPatient(true);
    setShowPatientResults(true);
    
    try {
      // Search in key fields with logical OR
      const s_f = ['identification', 'first_name', 'last_name', 'email'];
      const s_v = Array(s_f.length).fill(value);
      const s_o = 'or'; // Use OR for better matches
      
      const response = await api.get('/api/v1/patients', {
        params: {
          per_page: 10,
          s_f: JSON.stringify(s_f),
          s_v: JSON.stringify(s_v),
          s_o,
          sort: 'first_name,asc',
        }
      });
      
      setPatientOptions(response.data.data);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al buscar pacientes. Intente nuevamente.',
      });
      setPatientOptions([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Clear patient search
  const clearPatientSearch = () => {
    setPatientSearch('');
    setPatientOptions([]);
    setSelectedPatient(null);
    form.setValue('patient_id', null);
    setShowPatientResults(false);
  };

  // Handle patient selection
  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    form.setValue('patient_id', patient.id);
    setShowPatientResults(false);
  };

  // Calculate the discounted price
  const discountPercentage = form.watch('discount_percentage');
  const originalPrice = selectedLens ? Number(selectedLens.price) : 0;
  const discountedPrice = originalPrice - (originalPrice * (discountPercentage / 100));

  // Create discount request mutation
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await api.post('/api/v1/discount-requests', values);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discount-requests'] });
      queryClient.invalidateQueries({ queryKey: ['active-discounts'] });
      toast({
        title: isAdmin ? 'Descuento creado' : 'Solicitud de descuento enviada',
        description: isAdmin 
          ? 'El descuento ha sido creado y aplicado exitosamente' 
          : 'Su solicitud de descuento ha sido enviada para aprobación',
        variant: 'default',
      });
      onClose();
      if (onSuccess) {
        onSuccess(data.data);
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Hubo un error al crear la solicitud de descuento',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    // Validate lens selection
    if (!selectedLens) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un lente para aplicar el descuento',
        variant: 'destructive',
      });
      return;
    }

    // Ensure lens_id is set correctly
    values.lens_id = selectedLens.id;
    
    // Validate patient selection if not global
    if (!isGlobal && !selectedPatient && !values.patient_id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un paciente o marcar el descuento como global',
        variant: 'destructive',
      });
      return;
    }

    // Add the expiry date if one was selected
    if (expiryDate) {
      values.expiry_date = expiryDate;
    }

    // Apply global setting
    values.is_global = isGlobal;
    
    // If global, remove patient_id
    if (isGlobal) {
      values.patient_id = null;
    }

    // Submit the form
    try {
      createMutation.mutate(values);
    } catch (error) {
      console.error('Error submitting discount request:', error);
      toast({
        title: 'Error',
        description: 'Hubo un error al procesar la solicitud de descuento',
        variant: 'destructive',
      });
    }
  };

  // Handle lens search
  const handleLensSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLensSearch(value);
    
    if (value.length < 3) {
      setLensOptions([]);
      setShowLensResults(false);
      return;
    }
    
    setIsSearchingLens(true);
    setShowLensResults(true);
    
    try {
      // Search lenses by identifier or description
      const response = await api.get('/api/v1/lenses', {
        params: {
          per_page: 10,
          s_f: JSON.stringify(['identifier', 'description']),
          s_v: JSON.stringify([value, value]),
          s_o: 'or'
        }
      });
      
      setLensOptions(response.data.data);
    } catch (error) {
      console.error('Error searching lenses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al buscar lentes. Intente nuevamente.',
      });
      setLensOptions([]);
    } finally {
      setIsSearchingLens(false);
    }
  };

  // Clear lens search
  const clearLensSearch = () => {
    setLensSearch('');
    setLensOptions([]);
    setSelectedLens(null);
    form.setValue('lens_id', null);
    setShowLensResults(false);
  };

  // Handle lens selection
  const selectLens = (lens: Lens) => {
    setSelectedLens(lens);
    setLensSearch(lens.identifier);
    form.setValue('lens_id', lens.id);
    setShowLensResults(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" aria-describedby="discount-request-description">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">
            {isAdmin ? 'Crear Descuento' : 'Solicitar Descuento'} 
          </DialogTitle>
          <DialogDescription id="discount-request-description" className="text-sm">
            {isAdmin 
              ? 'Complete el formulario para crear un nuevo descuento.' 
              : 'Complete el formulario para solicitar un descuento. Su solicitud será revisada por un administrador.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Lens selection section */}
          {selectedLens ? (
            <div className="border border-blue-200 rounded-md p-2 bg-blue-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-xs text-blue-800">Lente seleccionado:</p>
                <p className="text-sm text-blue-700">{selectedLens.identifier} - {selectedLens.description}</p>
                <p className="text-xs text-blue-600">Precio: ${selectedLens.price}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                onClick={clearLensSearch}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Eliminar lente</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="lens_search" className="text-sm">Buscar lente</Label>
              <div className="relative">
                <Glasses className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="lens_search"
                  value={lensSearch}
                  onChange={handleLensSearch}
                  placeholder="Código o descripción del lente (mínimo 3 caracteres)"
                  className="pl-9 h-9"
                  autoComplete="off"
                />
                {isSearchingLens && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
                {lensSearch && !isSearchingLens && (
                  <div 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                    onClick={clearLensSearch}
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </div>
                )}
              </div>
              
              <div className="relative">
                {showLensResults && lensSearch.length >= 3 && (
                  <div className="border rounded-lg bg-white shadow-sm mt-1 max-h-40 overflow-auto absolute z-50 w-full">
                    {isSearchingLens ? (
                      <div className="p-2 text-center text-gray-400 text-sm">Buscando...</div>
                    ) : lensOptions.length > 0 ? (
                      lensOptions.map((lens) => (
                        <div
                          key={lens.id}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-0"
                          onClick={() => selectLens(lens)}
                        >
                          <div className="font-medium text-sm">{lens.identifier}</div>
                          <div className="text-xs text-gray-700">{lens.description}</div>
                          <div className="text-xs text-blue-600 font-medium">Precio: ${lens.price}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-center text-gray-500 text-sm">No se encontraron lentes</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patient and Global Switch in a grid */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-2 border rounded-md">
              <Label htmlFor="is_global" className="text-sm">Descuento para todos los pacientes</Label>
              <Switch
                id="is_global"
                checked={isGlobal}
                onCheckedChange={(checked) => {
                  setIsGlobal(checked);
                  form.setValue('is_global', checked);
                  if (checked) {
                    form.setValue('patient_id', null);
                  } else if (selectedPatient) {
                    form.setValue('patient_id', selectedPatient.id);
                  }
                }}
              />
            </div>

            {/* Patient selection - only show if not global */}
            {!isGlobal && (
              selectedPatient ? (
                <div className="border border-green-200 rounded-md p-2 bg-green-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-xs text-green-800">Paciente seleccionado:</p>
                    <p className="text-sm text-green-700">{selectedPatient.first_name} {selectedPatient.last_name}{selectedPatient.identification ? ` - ${selectedPatient.identification}` : ''}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 text-green-700 hover:text-green-900 hover:bg-green-100"
                    onClick={clearPatientSearch}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Eliminar paciente</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="patient_search" className="text-sm">Buscar paciente</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="patient_search"
                      value={patientSearch}
                      onChange={handlePatientSearch}
                      placeholder="Nombre, identificación o email"
                      className="pl-9 h-9"
                      autoComplete="off"
                    />
                    {isSearchingPatient && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {patientSearch && !isSearchingPatient && (
                      <div 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                        onClick={clearPatientSearch}
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    {showPatientResults && patientSearch.length >= 3 && (
                      <div className="border rounded-lg bg-white shadow-sm mt-1 max-h-40 overflow-auto absolute z-50 w-full">
                        {isSearchingPatient ? (
                          <div className="p-2 text-center text-gray-400 text-sm">Buscando...</div>
                        ) : patientOptions.length > 0 ? (
                          patientOptions.map((patient) => (
                            <div
                              key={patient.id}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-0"
                              onClick={() => selectPatient(patient)}
                            >
                              <div className="font-medium text-sm">{patient.first_name} {patient.last_name}</div>
                              <div className="text-xs text-gray-400">{patient.identification || patient.email}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-center text-gray-500 text-sm">No se encontraron pacientes</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Discount percentage and expiry date in a grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="discount_percentage" className="text-sm">Porcentaje (%)</Label>
              <Input
                id="discount_percentage"
                type="number"
                min={1}
                max={100}
                className="h-9"
                {...form.register('discount_percentage', { valueAsNumber: true })}
              />
              {form.formState.errors.discount_percentage && (
                <p className="text-xs text-red-500">{form.formState.errors.discount_percentage.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="expiry_date" className="text-sm">Fecha de expiración</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {expiryDate ? format(expiryDate, "dd/MM/yyyy") : "Opcional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate || undefined}
                    onSelect={(date) => {
                      setExpiryDate(date);
                      form.setValue('expiry_date', date || null);
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Price preview - more compact */}
          <div className="rounded-md bg-gradient-to-r from-purple-50 to-indigo-50 p-3 border border-purple-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Precio con descuento:</span>
              <span className="text-lg font-bold text-green-600">${discountedPrice.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>Original: <span className="line-through">${originalPrice.toFixed(2)}</span></span>
              <span>Ahorro: ${(originalPrice - discountedPrice).toFixed(2)} ({discountPercentage}%)</span>
            </div>
          </div>

          {/* Reason - smaller textarea */}
          <div className="space-y-1">
            <Label htmlFor="reason" className="text-sm">Motivo del descuento</Label>
            <Textarea
              id="reason"
              placeholder="Explique el motivo por el que solicita este descuento"
              {...form.register('reason')}
              rows={2}
              className="resize-none"
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-red-500">{form.formState.errors.reason.message}</p>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button 
              type="button" 
              onClick={onClose}
              variant="outline"
              disabled={createMutation.isPending}
              className="h-9"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 px-4"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isAdmin ? 'Creando...' : 'Enviando...'}
                </>
              ) : (
                isAdmin ? 'Crear Descuento' : 'Solicitar Descuento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountRequestModal; 