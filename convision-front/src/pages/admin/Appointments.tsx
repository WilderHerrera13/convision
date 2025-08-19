import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Patient type
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
}

interface Specialist {
  id: number;
  name: string;
  identification?: string;
  role: string;
}

interface AppointmentForm {
  date: Date;
  time: string;
  specialistId: number | null;
  reason: string;
}

// Validation schema for patient form
const patientSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  identification: z.string().min(5, "La identificación debe tener al menos 5 caracteres"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  phone: z.string().min(7, "El teléfono debe tener al menos 7 caracteres"),
  birth_date: z.string().min(1, "La fecha de nacimiento es requerida"),
  gender: z.enum(["male", "female", "other"]),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const Appointments: React.FC = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<AppointmentForm>({ 
    date: new Date(), 
    time: "10:00", 
    specialistId: null, 
    reason: '' 
  });
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Patient creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Initialize form
  const patientForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      identification: '',
      email: '',
      phone: '',
      birth_date: '',
      gender: 'male',
    },
  });

  // Fetch specialists on component mount
  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const response = await api.get('/api/v1/users', {
          params: {
            per_page: 100,
            s_f: JSON.stringify(['role']),
            s_v: JSON.stringify(['specialist']),
            sort: 'name,asc',
          },
        });
        setSpecialists(response.data.data);
      } catch (error) {
        console.error('Error fetching specialists:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los especialistas. Por favor, recargue la página.',
        });
      }
    };

    fetchSpecialists();
  }, [toast]);

  // Handle patient search
  const handlePatientSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientSearch(value);
    
    if (value.length < 3) {
      setPatientResults([]);
      return;
    }
    
    setIsSearching(true);
    
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
      
      setPatientResults(response.data.data);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al buscar pacientes. Intente nuevamente.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Clear patient search
  const clearPatientSearch = () => {
    setPatientSearch('');
    setPatientResults([]);
  };

  // Handle create patient form submission
  const handleCreatePatient = async (values: PatientFormValues) => {
    setIsCreatingPatient(true);
    
    try {
      const payload = {
        ...values,
        identification_type: 'dni',
      };
      
      const response = await api.post('/api/v1/patients', payload);
      const newPatient = response.data;
      
      // Set the newly created patient as selected
      setSelectedPatient(newPatient);
      setPatientSearch(`${newPatient.first_name} ${newPatient.last_name} (${newPatient.identification || newPatient.email})`);
      
      // Show success message
      toast({
        title: 'Paciente creado',
        description: `El paciente ${newPatient.first_name} ${newPatient.last_name} ha sido creado exitosamente.`,
      });
      
      // Close modal & move to next step
      setIsCreateModalOpen(false);
      patientForm.reset();
      setStep(2);
    } catch (error: Error | { response?: { data?: { message?: string } } } | unknown) {
      let message = 'No se pudo crear el paciente.';
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        message = err.response?.data?.message || message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  // Handle appointment creation
  const handleCreateAppointment = async () => {
    if (!selectedPatient || !appointment.specialistId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debe seleccionar un paciente y un especialista.',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Format date for API
      const dateStr = format(appointment.date, 'yyyy-MM-dd');
      const scheduled_at = `${dateStr} ${appointment.time}`;
      
      const payload = {
        patient_id: selectedPatient.id,
        specialist_id: appointment.specialistId,
        scheduled_at: scheduled_at,
        notes: appointment.reason,
      };
      
      await api.post('/api/v1/appointments', payload);
      
      toast({
        title: 'Cita creada',
        description: 'La cita ha sido programada exitosamente.',
      });
      
      // Reset form
      setSelectedPatient(null);
      setPatientSearch('');
      setPatientResults([]);
      setAppointment({ date: new Date(), time: "10:00", specialistId: null, reason: '' });
      setStep(1);
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear la cita. Por favor, intente nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <Card className="max-w-full">
        <CardHeader>
          <CardTitle>Crear Cita</CardTitle>
          <CardDescription>Registre una nueva cita para un paciente</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stepper UI */}
          <div className="mb-6 flex justify-center gap-2">
            <Button 
              variant={step === 1 ? 'default' : 'outline'} 
              onClick={() => setStep(1)}
              className="flex-1"
            >
              1. Paciente
            </Button>
            <Button 
              variant={step === 2 ? 'default' : 'outline'} 
              onClick={() => selectedPatient && setStep(2)} 
              disabled={!selectedPatient}
              className="flex-1"
            >
              2. Agendar Cita
            </Button>
            <Button 
              variant={step === 3 ? 'default' : 'outline'} 
              onClick={() => selectedPatient && appointment.specialistId && setStep(3)} 
              disabled={!selectedPatient || !appointment.specialistId}
              className="flex-1"
            >
              3. Confirmar
            </Button>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientSearch">Buscar Paciente</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="patientSearch"
                    placeholder="Nombre, identificación o correo (mínimo 3 caracteres)"
                    value={patientSearch}
                    onChange={handlePatientSearch}
                    className="pl-9 pr-9"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  {patientSearch && !isSearching && (
                    <div 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                      onClick={clearPatientSearch}
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Patient search results */}
              {patientSearch.length >= 3 && (
                <div className="border rounded-lg bg-white shadow-sm mt-1 max-h-48 overflow-auto">
                  {isSearching ? (
                    <div className="p-2 text-center text-gray-400">Buscando...</div>
                  ) : patientResults.length > 0 ? (
                    patientResults.map((patient) => (
                      <div
                        key={patient.id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setPatientSearch(`${patient.first_name} ${patient.last_name} (${patient.identification || patient.email})`);
                          setStep(2);
                        }}
                      >
                        {patient.first_name} {patient.last_name} <span className="text-xs text-gray-400">{patient.identification || patient.email}</span>
                      </div>
                    ))
                  ) : (
                    <Button
                      className="w-full text-left justify-start gap-1 px-3 py-2 h-auto font-medium text-green-700 bg-white hover:bg-green-50"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Crear nuevo paciente
                    </Button>
                  )}
                </div>
              )}
              
              {selectedPatient && (
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                  <div className="text-sm text-gray-500">ID: {selectedPatient.identification}</div>
                  <div className="text-sm text-gray-500">Email: {selectedPatient.email}</div>
                  {selectedPatient.phone && (
                    <div className="text-sm text-gray-500">Teléfono: {selectedPatient.phone}</div>
                  )}
                </div>
              )}
              
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => selectedPatient && setStep(2)}
                  disabled={!selectedPatient}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 2 && selectedPatient && (
            <div className="space-y-4">
              <div className="p-3 border rounded-md bg-blue-50 mb-4">
                <div className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                <div className="text-sm text-gray-500">ID: {selectedPatient.identification}</div>
              </div>
              
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Calendar
                  mode="single"
                  selected={appointment.date}
                  onSelect={(date) => date && setAppointment({ ...appointment, date })}
                  className="border rounded-md p-2"
                  disabled={{ before: new Date() }}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={appointment.time}
                  onChange={(e) => setAppointment({ ...appointment, time: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Especialista</Label>
                <Select 
                  value={appointment.specialistId?.toString() || ''} 
                  onValueChange={(value) => setAppointment({ ...appointment, specialistId: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar especialista" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialists.map((specialist) => (
                      <SelectItem key={specialist.id} value={specialist.id.toString()}>
                        {specialist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Motivo/Notas</Label>
                <Input
                  value={appointment.reason}
                  onChange={(e) => setAppointment({ ...appointment, reason: e.target.value })}
                  placeholder="Motivo de la consulta o notas adicionales"
                />
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!appointment.specialistId}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && selectedPatient && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Confirmar Cita</h3>
              
              <div className="space-y-2 border rounded-md p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-gray-500">Paciente:</span>
                    <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Identificación:</span>
                    <p>{selectedPatient.identification}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-sm text-gray-500">Fecha:</span>
                    <p>{format(appointment.date, 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Hora:</span>
                    <p>{appointment.time}</p>
                  </div>
                </div>
                
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Especialista:</span>
                  <p>{specialists.find(s => s.id === appointment.specialistId)?.name}</p>
                </div>
                
                {appointment.reason && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Motivo/Notas:</span>
                    <p>{appointment.reason}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button 
                  onClick={handleCreateAppointment}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar y Crear Cita
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Patient Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Paciente</DialogTitle>
            <DialogDescription>
              Complete los datos del nuevo paciente para crearlo en el sistema.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={patientForm.handleSubmit(handleCreatePatient)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    {...patientForm.register("first_name")}
                  />
                  {patientForm.formState.errors.first_name && (
                    <p className="text-sm text-red-500">
                      {patientForm.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido <span className="text-red-500">*</span></Label>
                  <Input
                    id="last_name"
                    {...patientForm.register("last_name")}
                  />
                  {patientForm.formState.errors.last_name && (
                    <p className="text-sm text-red-500">
                      {patientForm.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification">Identificación <span className="text-red-500">*</span></Label>
                <Input
                  id="identification"
                  {...patientForm.register("identification")}
                />
                {patientForm.formState.errors.identification && (
                  <p className="text-sm text-red-500">
                    {patientForm.formState.errors.identification.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  {...patientForm.register("email")}
                />
                {patientForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {patientForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  {...patientForm.register("phone")}
                />
                {patientForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">
                    {patientForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento <span className="text-red-500">*</span></Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...patientForm.register("birth_date")}
                  />
                  {patientForm.formState.errors.birth_date && (
                    <p className="text-sm text-red-500">
                      {patientForm.formState.errors.birth_date.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(value) => {
                      patientForm.setValue("gender", value as "male" | "female" | "other");
                    }}
                    defaultValue={patientForm.getValues("gender")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {patientForm.formState.errors.gender && (
                    <p className="text-sm text-red-500">
                      {patientForm.formState.errors.gender.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingPatient}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isCreatingPatient}
              >
                {isCreatingPatient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Paciente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointments; 