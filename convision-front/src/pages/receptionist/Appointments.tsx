import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, addMinutes, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from '@/components/ui/use-toast';
import Pagination from '@/components/ui/pagination';

// Icons
import { 
  Plus, 
  Calendar, 
  User, 
  Stethoscope, 
  StickyNote, 
  Play, 
  Clock, 
  ChevronRight, 
  Search, 
  Filter, 
  Bookmark, 
  CheckCircle,
  FileText,
  MoreHorizontal,
  Eye,
  Archive,
  Info,
  X,
  Loader2
} from 'lucide-react';

// Services
import ApiService from '@/services/ApiService';
import { appointmentsService } from '@/services/appointmentsService';
import { useAuth } from '@/contexts/AuthContext';
import { translateGender, formatDate } from '@/lib/utils';

// Form validation schema
const appointmentSchema = z.object({
  patientName: z.string().min(2, 'El nombre del paciente es requerido'),
  specialistId: z.string().min(1, 'Debe seleccionar un especialista'),
  date: z.string().min(1, 'La fecha es requerida'),
  time: z.string().min(1, 'La hora es requerida'),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
};

type Specialist = {
  id: number;
  name: string;
  identification?: string;
  role: string;
};

type Appointment = {
  id: number;
  patient: Patient;
  specialist: Specialist;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed';
  notes?: string;
  taken_by_id?: number;
  takenBy?: {
    id: number;
    name: string;
  };
};

type AppointmentsResponse = {
  data: Appointment[];
  meta: {
    current_page: number[];
    last_page: number[];
    per_page: number[];
    total: number[];
    from: number[];
    to: number[];
  };
  links: {
    first: string[];
    last: string[];
    prev: (string | null)[];
    next: (string | null)[];
  };
};

const Appointments: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form setup
  const now = new Date();
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: '',
      specialistId: '',
      date: format(now, 'yyyy-MM-dd'),
      time: format(now, 'HH:mm'),
      notes: '',
    },
  });

  // Fetch specialists
  const { data: specialists, isLoading: isLoadingSpecialists } = useQuery({
    queryKey: ['specialists'],
    queryFn: appointmentsService.getSpecialists,
  });

  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const {
    data: patientOptions = [],
    isLoading: isLoadingPatientOptions,
    refetch: refetchPatients,
  } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => 
      patientSearch.length >= 3 // Only search if 3+ characters
        ? appointmentsService.searchPatients(patientSearch)
        : Promise.resolve([]),
    enabled: false, // Disable automatic fetching - we'll trigger manually with refetch after debounce
  });

  // Handle patient search input with debouncing
  const handlePatientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientSearch(value);
    setSelectedPatient(null); // Reset selection when typing
    form.setValue('patientName', '');
    
    // Clear any existing timeout
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    
    // Only trigger search if input is at least 3 characters
    if (value.length >= 3) {
      // Set new timeout to trigger search after 300ms of user stopping typing
      const timeout = setTimeout(() => {
        refetchPatients();
      }, 300);
      setSearchDebounceTimeout(timeout);
    }
  };

  // Add a function to clear the patient search
  const clearPatientSearch = () => {
    setPatientSearch('');
    setSelectedPatient(null);
    form.setValue('patientName', '');
    
    // Also clear any pending search
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
      setSearchDebounceTimeout(null);
    }
  };

  // Example filter state (you can make this dynamic with a search form)
  const [filters, setFilters] = React.useState({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);

  // Add a filter state for specialists to view only in_progress appointments
  const [viewFilter, setViewFilter] = useState<string>('all'); // 'all' or 'in_progress'

  // Add state for active appointment and paused appointments
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [pausedAppointments, setPausedAppointments] = useState<Appointment[]>([]);

  // Add search filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'paused' | 'completed'>('all');

  // Update filters when status changes
  useEffect(() => {
    let newFilters = { ...filters };
    
    // Only add status to API filters if not 'all'
    if (filterStatus !== 'all') {
      newFilters = { ...newFilters, status: filterStatus };
    } else {
      // Remove status filter if it exists
      if ('status' in newFilters) {
        const { status, ...rest } = newFilters;
        newFilters = rest;
      }
    }
    
    // For debugging
    console.log("Filter status changed:", filterStatus);
    console.log("New filters:", newFilters);
    
    setFilters(newFilters);
  }, [filterStatus]);

  // Fetch appointments
  const { data: appointmentsData, isLoading: isLoadingAppointments, refetch } = useQuery<AppointmentsResponse>({
    queryKey: ['appointments', filters, page, perPage, viewFilter],
    queryFn: () => appointmentsService.getAppointments({ 
      filters, 
      page, 
      perPage,
      view: user?.role === 'specialist' && viewFilter === 'in_progress' ? 'in_progress' : undefined 
    }),
  });

  const appointments = appointmentsData?.data || [];
  const meta = appointmentsData?.meta;
  const links = appointmentsData?.links;

  // Find active in-progress appointment and paused appointments for specialist
  useEffect(() => {
    if (user?.role === 'specialist' && appointments) {
      const inProgressAppointment = appointments.find(
        (app) => app.status === 'in_progress' && app.taken_by_id === user.id
      );
      
      const pausedApps = appointments.filter(
        (app) => app.status === 'paused' && app.taken_by_id === user.id
      );
      
      setActiveAppointment(inProgressAppointment || null);
      setPausedAppointments(pausedApps);
    }
  }, [appointments, user]);

  // Modal state for patient creation
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    identification: '',
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
  });
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const openPatientCreationModal = () => {
    console.log('Opening patient creation modal - function called');
    
    // Force any existing dialogs closed first to prevent modal conflicts
    document.body.classList.add('overflow-hidden');
    
    // Reset form before opening
    setPatientForm({
      first_name: '',
      last_name: '',
      identification: '',
      email: '',
      phone: '',
      birth_date: '',
      gender: '',
    });
    
    console.log('Setting modal open state to true');
    setIsPatientModalOpen(true);
    console.log('Modal open state set to true');
    
    // Force re-render after a short delay to ensure state is updated
    setTimeout(() => {
      console.log('Modal state after timeout:', isPatientModalOpen);
    }, 100);
  };

  const closePatientModal = () => {
    if (!isCreatingPatient) {
      setIsPatientModalOpen(false);
      document.body.classList.remove('overflow-hidden');
    }
  };

  // Update the handleCreatePatient function
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleCreatePatient called');
    
    // Validate form fields
    if (!patientForm.first_name || !patientForm.last_name || !patientForm.identification || 
        !patientForm.email || !patientForm.phone || !patientForm.birth_date || !patientForm.gender) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, complete todos los campos requeridos.',
      });
      return;
    }
    
    setIsCreatingPatient(true);
    
    try {
      const payload = {
        first_name: patientForm.first_name,
        last_name: patientForm.last_name,
        identification: patientForm.identification,
        email: patientForm.email,
        phone: patientForm.phone,
        identification_type: 'dni', // Or let user select
        birth_date: patientForm.birth_date,
        gender: patientForm.gender,
      };
      
      console.log('Creating patient with payload:', payload);
      const newPatient: Patient = await ApiService.post('/api/v1/patients', payload);
      console.log('Patient created successfully:', newPatient);
      
      // Set the newly created patient as selected
      setSelectedPatient(newPatient);
      setPatientSearch(`${newPatient.first_name} ${newPatient.last_name} (${newPatient.identification || newPatient.email})`);
      form.setValue('patientName', `${newPatient.first_name} ${newPatient.last_name}`);
      
      // Show success message
      toast({
        title: 'Paciente creado',
        description: `El paciente ${newPatient.first_name} ${newPatient.last_name} ha sido creado exitosamente.`,
      });
      
      // Reset form and close modal
      setPatientForm({ first_name: '', last_name: '', identification: '', email: '', phone: '', birth_date: '', gender: '' });
      setIsPatientModalOpen(false);
      
      // Check if we need to reopen the appointment dialog
      const shouldReopenAppointmentDialog = localStorage.getItem('reopenAppointmentDialog') === 'true';
      if (shouldReopenAppointmentDialog) {
        // Clear the flag
        localStorage.removeItem('reopenAppointmentDialog');
        
        // Reopen the appointment dialog with a slight delay to avoid animation conflicts
        setTimeout(() => {
          setShowNewAppointmentDialog(true);
          
          // Move to specialist selection step
          setStep(1);
          
          // Force-select the specialist tab after a small delay
          setTimeout(() => {
            const specialistTab = document.querySelector('[value="specialist"]') as HTMLButtonElement;
            if (specialistTab) {
              specialistTab.click();
            }
          }, 300);
        }, 300);
      }
    } catch (error: unknown) {
      let message = 'No se pudo crear el paciente.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        message = err.response?.data?.message || message;
      }
      console.error('Error creating patient:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    // Only proceed if we're on the final step
    if (step !== steps.length - 1) {
      return;
    }

    try {
      // Find selected patient and specialist
      const patient = selectedPatient;
      const specialist = specialists?.find(s => String(s.id) === String(form.watch('specialistId')));
      if (!patient || !specialist) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Debe seleccionar un paciente y un especialista.',
        });
        return;
      }
      // Combine date and time for scheduled_at
      const scheduled_at = `${data.date} ${data.time}`;
      const payload = {
        specialist_id: specialist.id,
        patient_id: patient.id,
        scheduled_at,
        notes: data.notes || '',
      };
      await ApiService.post('/api/v1/appointments', payload);
      toast({
        title: 'Cita creada',
        description: 'La cita ha sido programada exitosamente.',
      });
      form.reset();
      setSelectedPatient(null);
      setPatientSearch('');
      setStep(0);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear la cita. Por favor, intente nuevamente.',
      });
    }
  };

  // Helper to check if current step is valid
  const isStepValid = () => {
    if (step === 0) {
      return !!form.watch('patientName');
    }
    if (step === 1) {
      return !!form.watch('specialistId');
    }
    if (step === 2) {
      return !!form.watch('date') && !!form.watch('time');
    }
    return true;
  };

  // Specialist search state
  const [specialistSearch, setSpecialistSearch] = useState('');

  // Stepped form fields
  const steps = [
    {
      label: 'Paciente',
      content: (
        <div className="space-y-2">
          <Label htmlFor="patientSearch">Buscar Paciente</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              id="patientSearch"
              value={patientSearch}
              onChange={handlePatientSearchChange}
              placeholder="Nombre o identificación (mínimo 3 caracteres)"
              className="pl-9"
              autoComplete="off"
            />
            {/* Show loading indicator when API call is in progress */}
            {isLoadingPatientOptions && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            {/* Show clear button when there's text */}
            {patientSearch && !isLoadingPatientOptions && (
              <div 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                onClick={clearPatientSearch}
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </div>
            )}
          </div>
          
          {/* Only show dropdown if no patient is selected and searched term is 3+ chars */}
          {patientSearch.length >= 3 && !selectedPatient && (
            <div className="border rounded-lg bg-white shadow-sm mt-1 max-h-48 overflow-auto">
              {isLoadingPatientOptions ? (
                <div className="p-2 text-center text-gray-400">Buscando...</div>
              ) : patientOptions.length > 0 ? (
                patientOptions.map((patient) => (
                  <div
                    key={patient.id}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setPatientSearch(`${patient.first_name} ${patient.last_name} (${patient.identification || patient.email})`);
                      form.setValue('patientName', `${patient.first_name} ${patient.last_name}`);
                    }}
                  >
                    {patient.first_name} {patient.last_name} <span className="text-xs text-gray-400">{patient.identification || patient.email}</span>
                  </div>
                ))
              ) : (
                <Button
                  className="w-full text-left justify-start gap-1 px-3 py-2 h-auto font-medium text-green-700 bg-white hover:bg-green-50"
                  onClick={(e) => {
                    console.log('Create patient button clicked from appointment dialog');
                    e.preventDefault();
                    e.stopPropagation();
                    // Close the appointment dialog first to avoid nested dialog issues
                    setShowNewAppointmentDialog(false);
                    // Delay opening the patient modal slightly to ensure proper rendering
                    setTimeout(() => {
                      openPatientCreationModal();
                      // Set a flag to indicate we should reopen the appointment dialog when patient is created
                      localStorage.setItem('reopenAppointmentDialog', 'true');
                    }, 100);
                  }}
                >
                  <Plus className="h-4 w-4" /> Crear nuevo paciente
                </Button>
              )}
            </div>
          )}
          {form.formState.errors.patientName && (
            <p className="text-sm text-red-500">
              {form.formState.errors.patientName.message}
            </p>
          )}
          {/* Patient Creation Modal */}
          <Dialog 
            open={isPatientModalOpen} 
            onOpenChange={(open) => {
              console.log('Dialog onOpenChange fired with value:', open);
              // If trying to close and currently creating a patient, prevent closing
              if (!open && isCreatingPatient) {
                console.log('Preventing dialog close while creating patient');
                return;
              }
              console.log('Setting dialog open state to:', open);
              setIsPatientModalOpen(open);
            }}
          >
            <DialogContent 
              className="max-w-md"
              style={{ 
                position: 'fixed', 
                zIndex: 9999,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <DialogHeader>
                <DialogTitle>Crear Paciente</DialogTitle>
                <DialogDescription>
                  Complete los datos del nuevo paciente para crearlo en el sistema.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <Label htmlFor="first_name">Nombre <span className="text-red-500">*</span></Label>
                  <Input 
                    id="first_name" 
                    value={patientForm.first_name} 
                    onChange={e => setPatientForm(f => ({ ...f, first_name: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido <span className="text-red-500">*</span></Label>
                  <Input 
                    id="last_name" 
                    value={patientForm.last_name} 
                    onChange={e => setPatientForm(f => ({ ...f, last_name: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="identification">Identificación <span className="text-red-500">*</span></Label>
                  <Input 
                    id="identification" 
                    value={patientForm.identification} 
                    onChange={e => setPatientForm(f => ({ ...f, identification: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={patientForm.email} 
                    onChange={e => setPatientForm(f => ({ ...f, email: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                  <Input 
                    id="phone" 
                    value={patientForm.phone} 
                    onChange={e => setPatientForm(f => ({ ...f, phone: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Fecha de Nacimiento <span className="text-red-500">*</span></Label>
                  <Input 
                    id="birth_date" 
                    type="date" 
                    value={patientForm.birth_date} 
                    onChange={e => setPatientForm(f => ({ ...f, birth_date: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Género <span className="text-red-500">*</span></Label>
                  <select 
                    id="gender" 
                    value={patientForm.gender} 
                    onChange={e => setPatientForm(f => ({ ...f, gender: e.target.value }))} 
                    required 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="" disabled>Seleccione género</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={closePatientModal} 
                    disabled={isCreatingPatient}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreatingPatient}
                    className={isCreatingPatient ? 'opacity-70 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                  >
                    {isCreatingPatient ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Paciente'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
    {
      label: 'Especialista',
      content: (
        <div className="space-y-2">
          <Label htmlFor="specialistSearch">Buscar Especialista</Label>
          <Input
            id="specialistSearch"
            value={specialistSearch}
            onChange={e => {
              setSpecialistSearch(e.target.value);
              form.setValue('specialistId', '');
            }}
            placeholder="Nombre o identificación"
            autoComplete="off"
          />
          {/* Only show dropdown if there is a search and no specialist is selected */}
          {specialistSearch.length > 1 && !form.watch('specialistId') && (
            <div className="border rounded bg-white shadow mt-1 max-h-40 overflow-auto z-10">
              {isLoadingSpecialists ? (
                <div className="p-2 text-center text-gray-400">Buscando...</div>
              ) : specialists && specialists.length > 0 ? (
                specialists
                  .filter((specialist) => {
                    const search = specialistSearch.toLowerCase();
                    return (
                      specialist.name.toLowerCase().includes(search) ||
                      (specialist.identification && specialist.identification.toLowerCase().includes(search))
                    );
                  })
                  .map((specialist) => (
                    <div
                      key={specialist.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${form.watch('specialistId') === String(specialist.id) ? 'bg-blue-100' : ''}`}
                      onClick={() => {
                        form.setValue('specialistId', String(specialist.id), { shouldValidate: true });
                        setSpecialistSearch(`${specialist.name}${specialist.identification ? ` (${specialist.identification})` : ''}`);
                      }}
                    >
                      {specialist.name} <span className="text-xs text-gray-400">{specialist.identification}</span>
                    </div>
                  ))
              ) : (
                <div className="p-2 text-center text-gray-400">No hay especialistas disponibles</div>
              )}
            </div>
          )}
          {form.formState.errors.specialistId && (
            <p className="text-sm text-red-500">
              {form.formState.errors.specialistId.message}
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Fecha y Hora',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  id="date"
                  value={form.watch('date') ? format(new Date(form.watch('date')), 'dd/MM/yyyy') : ''}
                  placeholder="dd/mm/yyyy"
                  readOnly
                  className="cursor-pointer bg-white"
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <UiCalendar
                  mode="single"
                  selected={form.watch('date') ? new Date(form.watch('date')) : undefined}
                  onSelect={date => {
                    if (date && !isBefore(date, startOfDay(now))) {
                      form.setValue('date', date.toISOString().split('T')[0], { shouldValidate: true });
                    }
                  }}
                  initialFocus
                  disabled={date => isBefore(date, startOfDay(now))}
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-sm text-red-500">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Hora</Label>
            <TimePicker
              value={form.watch('time') || ''}
              onChange={val => {
                // Only allow current or future time if today is selected
                const selectedDate = form.watch('date');
                const todayStr = format(now, 'yyyy-MM-dd');
                if (selectedDate === todayStr) {
                  const [h, m] = val.split(':');
                  const selected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m));
                  if (isBefore(selected, now)) return;
                }
                form.setValue('time', val, { shouldValidate: true });
              }}
              label={undefined}
              placeholder="hh:mm"
            />
            {form.formState.errors.time && (
              <p className="text-sm text-red-500">
                {form.formState.errors.time.message}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      label: 'Notas',
      content: (
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Input
            id="notes"
            {...form.register('notes')}
            placeholder="Notas adicionales (opcional)"
          />
        </div>
      ),
    },
  ];

  // Stepper icons for each step
  const stepIcons = [
    <User key="user" className="w-7 h-7" />, // Paciente
    <Stethoscope key="spec" className="w-7 h-7" />, // Especialista
    <Calendar key="calendar" className="w-7 h-7" />, // Fecha y Hora
    <StickyNote key="note" className="w-7 h-7" />, // Notas
  ];

  // Convert regular status to a user-friendly string
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'in_progress': return 'En progreso';
      case 'paused': return 'Pausada';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };
  
  // Get appropriate styling for each status
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-100',
          icon: <Calendar className="h-3.5 w-3.5 mr-1" />
        };
      case 'in_progress':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-100',
          icon: <Play className="h-3.5 w-3.5 mr-1" />
        };
      case 'paused':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-100',
          icon: <Clock className="h-3.5 w-3.5 mr-1" />
        };
      case 'completed':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-100',
          icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-100',
          icon: <Info className="h-3.5 w-3.5 mr-1" />
        };
    }
  };
  
  // Filter appointments by search term only (status filtering is now handled by the backend)
  const filteredAppointments = appointments.filter(appointment => {
    // Only apply search term filtering (status filtering happens on the backend)
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const patientName = `${appointment.patient.first_name} ${appointment.patient.last_name}`.toLowerCase();
    const specialistName = appointment.specialist.name.toLowerCase();
    
    return (
      patientName.includes(search) || 
      specialistName.includes(search) ||
      (appointment.patient.identification && appointment.patient.identification.toLowerCase().includes(search))
    );
  });

  // Modal for new appointment
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);

  // Add debug effect to help troubleshoot the modal issue
  useEffect(() => {
    // Add event listener to document to detect if the modal is visible
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPatientModalOpen) {
        console.log('Escape key pressed while modal is open');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    console.log('Current isPatientModalOpen state:', isPatientModalOpen);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPatientModalOpen]);

  // Add debug effect to track step changes
  useEffect(() => {
    console.log('Step changed:', step);
    console.log('Selected patient:', selectedPatient);
    console.log('Form values:', form.getValues());
  }, [step, selectedPatient]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Gestión de Citas</h1>
          <p className="text-slate-500">Administra las citas médicas y realiza un seguimiento de los pacientes</p>
        </div>
        
        {/* Active In-Progress Appointment Banner for Specialists */}
        {user?.role === 'specialist' && activeAppointment && (
          <div className="mb-8 transition-all duration-300 hover:scale-[1.01]">
            <div 
              onClick={() => navigate(`/specialist/appointments/${activeAppointment.id}`)}
              className="cursor-pointer"
            >
              <Card className="overflow-hidden border-2 border-primary/20">
                <CardHeader className="bg-primary/5 border-b pb-4 flex flex-row justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Play className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Cita Activa en Progreso</CardTitle>
                      <p className="text-sm text-gray-500">Esta cita está actualmente en proceso</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 px-3">
                    En progreso
                  </Badge>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Paciente</p>
                        <p className="font-medium">{activeAppointment.patient.first_name} {activeAppointment.patient.last_name}</p>
                        <p className="text-xs text-slate-400">ID: {activeAppointment.patient.identification}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>
                          {formatDate(activeAppointment.scheduled_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>
                          {new Date(activeAppointment.scheduled_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end items-center">
                      <Button 
                        variant="outline" 
                        className="border-primary/20 hover:bg-primary/5"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/specialist/appointments/${activeAppointment.id}`);
                        }}
                      >
                        Ver detalles <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Paused Appointments Banner for Specialists */}
        {user?.role === 'specialist' && pausedAppointments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Citas Pausadas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pausedAppointments.map(appointment => (
                <div 
                  key={appointment.id}
                  onClick={() => navigate(`/specialist/appointments/${appointment.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="overflow-hidden border border-orange-200 hover:shadow-md transition-all">
                    <CardHeader className="bg-orange-50 py-3 flex flex-row justify-between items-center">
                      <div className="flex items-center">
                        <div className="bg-orange-100 p-1.5 rounded-lg mr-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                        </div>
                        <CardTitle className="text-base">Cita Pausada</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 px-2 text-xs">
                        Pausada
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{appointment.patient.first_name} {appointment.patient.last_name}</span>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/specialist/appointments/${appointment.id}`);
                          }}
                        >
                          Reanudar <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* New Appointment Button for Non-specialists */}
          {user?.role !== 'specialist' && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowNewAppointmentDialog(true)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Crear Cita
              </Button>
              
              {/* New Appointment Dialog */}
              <Dialog open={showNewAppointmentDialog} onOpenChange={setShowNewAppointmentDialog}>
                <DialogContent className="sm:max-w-[600px] p-0">
                  <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-2xl font-bold">Crear Nueva Cita</DialogTitle>
                  </DialogHeader>
                  
                  <Tabs 
                    defaultValue="patient"
                    value={
                      step === 0 ? "patient" : 
                      step === 1 ? "specialist" : 
                      step === 2 ? "datetime" : 
                      "notes"
                    }
                    onValueChange={(value) => {
                      // Update the step based on the selected tab
                      if (value === "patient") setStep(0);
                      else if (value === "specialist") setStep(1);
                      else if (value === "datetime") setStep(2);
                      else if (value === "notes") setStep(3);
                    }}
                    className="w-full"
                  >
                    <div className="px-6 border-b">
                      <TabsList className="grid grid-cols-4 h-14">
                        <TabsTrigger 
                          value="patient" 
                          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                          disabled={step > 0 && !selectedPatient}
                          onClick={() => console.log("Patient tab clicked")}
                        >
                          <div className="flex flex-col items-center">
                            <User className="h-4 w-4 mb-1" />
                            <span className="text-xs">Paciente</span>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="specialist" 
                          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                          disabled={step > 1 || !selectedPatient}
                          onClick={() => console.log("Specialist tab clicked")}
                        >
                          <div className="flex flex-col items-center">
                            <Stethoscope className="h-4 w-4 mb-1" />
                            <span className="text-xs">Especialista</span>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="datetime" 
                          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                          disabled={step > 2 || !form.watch('specialistId')}
                          onClick={() => console.log("DateTime tab clicked")}
                        >
                          <div className="flex flex-col items-center">
                            <Calendar className="h-4 w-4 mb-1" />
                            <span className="text-xs">Fecha/Hora</span>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="notes" 
                          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                          disabled={step > 3 || !form.watch('date') || !form.watch('time')}
                          onClick={() => console.log("Notes tab clicked")}
                        >
                          <div className="flex flex-col items-center">
                            <StickyNote className="h-4 w-4 mb-1" />
                            <span className="text-xs">Notas</span>
                          </div>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <div className="p-6">
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          // Only submit if we're on the final step (notes)
                          if (step === steps.length - 1) {
                            form.handleSubmit(onSubmit)(e);
                            if (form.formState.isValid) {
                              setShowNewAppointmentDialog(false);
                            }
                          } else {
                            // If not on final step, just prevent default and do nothing
                            e.preventDefault();
                          }
                        }}
                      >
                        <TabsContent value="patient" className="mt-2 space-y-4">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="patientSearch" className="text-base font-medium">
                                {selectedPatient 
                                  ? `Paciente seleccionado: ${selectedPatient.first_name} ${selectedPatient.last_name}`
                                  : "Buscar Paciente"}
                              </Label>
                              
                              {selectedPatient && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedPatient(null);
                                    setPatientSearch('');
                                    form.setValue('patientName', '');
                                    setStep(0);
                                    
                                    // Force-select the patient tab
                                    setTimeout(() => {
                                      const patientTab = document.querySelector('[value="patient"]') as HTMLButtonElement;
                                      if (patientTab) {
                                        patientTab.click();
                                      }
                                    }, 50);
                                    
                                    console.log('Patient selection cleared from header button');
                                  }}
                                  className="text-xs h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3 mr-1" /> Descartar selección
                                </Button>
                              )}
                            </div>
                            
                            {selectedPatient ? (
                              <div className="bg-slate-50 p-4 rounded-lg border relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedPatient(null);
                                    setPatientSearch('');
                                    form.setValue('patientName', '');
                                    setStep(0);
                                    
                                    // Force-select the patient tab
                                    setTimeout(() => {
                                      const patientTab = document.querySelector('[value="patient"]') as HTMLButtonElement;
                                      if (patientTab) {
                                        patientTab.click();
                                      }
                                    }, 50);
                                    
                                    console.log('Patient selection cleared');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-lg">
                                      {selectedPatient.first_name} {selectedPatient.last_name}
                                    </div>
                                    <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:gap-3">
                                      <span>ID: {selectedPatient.identification || 'N/A'}</span>
                                      {selectedPatient.email && (
                                        <span className="hidden sm:inline text-slate-300">•</span>
                                      )}
                                      {selectedPatient.email && (
                                        <span>{selectedPatient.email}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Add a clear patient button */}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-4 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedPatient(null);
                                    setPatientSearch('');
                                    form.setValue('patientName', '');
                                    setStep(0);
                                    
                                    // Force-select the patient tab
                                    setTimeout(() => {
                                      const patientTab = document.querySelector('[value="patient"]') as HTMLButtonElement;
                                      if (patientTab) {
                                        patientTab.click();
                                      }
                                    }, 50);
                                    
                                    console.log('Patient selection cleared');
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" /> Descartar paciente seleccionado
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="relative">
                                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                  <Input
                                    id="patientSearch"
                                    value={patientSearch}
                                    onChange={handlePatientSearchChange}
                                    placeholder="Nombre o identificación (mínimo 3 caracteres)"
                                    className="pl-9"
                                    autoComplete="off"
                                  />
                                  {/* Show loading indicator when API call is in progress */}
                                  {isLoadingPatientOptions && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    </div>
                                  )}
                                  {/* Show clear button when there's text */}
                                  {patientSearch && !isLoadingPatientOptions && (
                                    <div 
                                      className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                      onClick={clearPatientSearch}
                                    >
                                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Patient search results */}
                                {patientSearch.length >= 3 && !selectedPatient && (
                                  <div className="border rounded-lg bg-white shadow-sm mt-1 max-h-48 overflow-auto">
                                    {isLoadingPatientOptions ? (
                                      <div className="p-2 text-center text-gray-400">Buscando...</div>
                                    ) : patientOptions.length > 0 ? (
                                      patientOptions.map((patient) => (
                                        <div
                                          key={patient.id}
                                          className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                                          onClick={() => {
                                            setSelectedPatient(patient);
                                            setPatientSearch(`${patient.first_name} ${patient.last_name} (${patient.identification || patient.email})`);
                                            form.setValue('patientName', `${patient.first_name} ${patient.last_name}`);
                                          }}
                                        >
                                          {patient.first_name} {patient.last_name} <span className="text-xs text-gray-400">{patient.identification || patient.email}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <Button
                                        className="w-full text-left justify-start gap-1 px-3 py-2 h-auto font-medium text-green-700 bg-white hover:bg-green-50"
                                        onClick={(e) => {
                                          console.log('Create patient button clicked from appointment dialog');
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // Close the appointment dialog first to avoid nested dialog issues
                                          setShowNewAppointmentDialog(false);
                                          // Delay opening the patient modal slightly to ensure proper rendering
                                          setTimeout(() => {
                                            openPatientCreationModal();
                                            // Set a flag to indicate we should reopen the appointment dialog when patient is created
                                            localStorage.setItem('reopenAppointmentDialog', 'true');
                                          }, 100);
                                        }}
                                      >
                                        <Plus className="h-4 w-4" /> Crear nuevo paciente
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                            {form.formState.errors.patientName && (
                              <p className="text-sm text-red-500">
                                {form.formState.errors.patientName.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowNewAppointmentDialog(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              disabled={!selectedPatient}
                              onClick={() => {
                                if (selectedPatient) {
                                  console.log('Moving to specialist selection step');
                                  setStep(1);
                                  // Add a small timeout to ensure step change is processed before tab change
                                  setTimeout(() => {
                                    // Force-select the specialist tab
                                    const specialistTab = document.querySelector('[value="specialist"]') as HTMLButtonElement;
                                    if (specialistTab) {
                                      specialistTab.click();
                                    }
                                  }, 50);
                                }
                              }}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="specialist" className="mt-2 space-y-4">
                          <div className="space-y-4">
                            <Label htmlFor="specialistSearch" className="text-base font-medium">Seleccionar Especialista</Label>
                            
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                id="specialistSearch"
                                value={specialistSearch}
                                onChange={e => {
                                  setSpecialistSearch(e.target.value);
                                  form.setValue('specialistId', '');
                                }}
                                placeholder="Buscar por nombre"
                                className="pl-9"
                                autoComplete="off"
                              />
                            </div>
                            
                            {/* Specialist search results */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto py-1">
                              {isLoadingSpecialists ? (
                                <div className="col-span-2 p-3 text-center text-slate-500">
                                  <div className="h-5 w-5 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-1"></div>
                                  Cargando especialistas...
                                </div>
                              ) : specialists && specialists.length > 0 ? (
                                specialists
                                  .filter((specialist) => {
                                    const search = specialistSearch.toLowerCase();
                                    return !search || 
                                      specialist.name.toLowerCase().includes(search) ||
                                      (specialist.identification && specialist.identification.toLowerCase().includes(search));
                                  })
                                  .map((specialist) => (
                                    <div
                                      key={specialist.id}
                                      className={`p-3 border rounded-lg cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors
                                        ${form.watch('specialistId') === String(specialist.id) ? 'bg-primary/10 border-primary/20' : 'bg-white'}`}
                                      onClick={() => {
                                        form.setValue('specialistId', String(specialist.id), { shouldValidate: true });
                                        setSpecialistSearch(specialist.name);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                          <Stethoscope className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div>
                                          <div className="font-medium">{specialist.name}</div>
                                          {specialist.identification && (
                                            <div className="text-xs text-slate-500">ID: {specialist.identification}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <div className="col-span-2 p-4 text-center text-slate-500 bg-slate-50 rounded-lg">
                                  No hay especialistas disponibles
                                </div>
                              )}
                            </div>
                            
                            {form.formState.errors.specialistId && (
                              <p className="text-sm text-red-500">
                                {form.formState.errors.specialistId.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex justify-between gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(0)}
                            >
                              Anterior
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewAppointmentDialog(false)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                disabled={!form.watch('specialistId')}
                                onClick={() => {
                                  if (form.watch('specialistId')) {
                                    console.log('Moving to date/time selection step');
                                    setStep(2);
                                    // Add a small timeout to ensure step change is processed before tab change
                                    setTimeout(() => {
                                      // Force-select the datetime tab
                                      const datetimeTab = document.querySelector('[value="datetime"]') as HTMLButtonElement;
                                      if (datetimeTab) {
                                        datetimeTab.click();
                                      }
                                    }, 50);
                                  }
                                }}
                              >
                                Siguiente
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="datetime" className="mt-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label htmlFor="date" className="text-base font-medium">Fecha</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={`w-full justify-start text-left font-normal ${!form.watch('date') ? 'text-slate-400' : ''}`}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {form.watch('date') ? format(new Date(form.watch('date')), 'dd/MM/yyyy') : "Seleccionar fecha"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <UiCalendar
                                    mode="single"
                                    selected={form.watch('date') ? new Date(form.watch('date')) : undefined}
                                    onSelect={(date) => {
                                      if (date && !isBefore(date, startOfDay(now))) {
                                        form.setValue('date', date.toISOString().split('T')[0], { shouldValidate: true });
                                      }
                                    }}
                                    initialFocus
                                    disabled={(date) => isBefore(date, startOfDay(now))}
                                  />
                                </PopoverContent>
                              </Popover>
                              {form.formState.errors.date && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.date.message}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <Label htmlFor="time" className="text-base font-medium">Hora</Label>
                              <TimePicker
                                value={form.watch('time') || ''}
                                onChange={(val) => {
                                  // Only allow current or future time if today is selected
                                  const selectedDate = form.watch('date');
                                  const todayStr = format(now, 'yyyy-MM-dd');
                                  if (selectedDate === todayStr) {
                                    const [h, m] = val.split(':');
                                    const selected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m));
                                    if (isBefore(selected, now)) return;
                                  }
                                  form.setValue('time', val, { shouldValidate: true });
                                }}
                                label={undefined}
                                placeholder="Seleccionar hora"
                              />
                              {form.formState.errors.time && (
                                <p className="text-sm text-red-500">
                                  {form.formState.errors.time.message}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(1)}
                            >
                              Anterior
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewAppointmentDialog(false)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                disabled={!form.watch('date') || !form.watch('time')}
                                onClick={() => {
                                  if (form.watch('date') && form.watch('time')) {
                                    console.log('Moving to notes step');
                                    setStep(3);
                                    // Add a small timeout to ensure step change is processed before tab change
                                    setTimeout(() => {
                                      // Force-select the notes tab
                                      const notesTab = document.querySelector('[value="notes"]') as HTMLButtonElement;
                                      if (notesTab) {
                                        notesTab.click();
                                      }
                                    }, 50);
                                  }
                                }}
                              >
                                Siguiente
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="notes" className="mt-2 space-y-4">
                          <div className="space-y-3">
                            <Label htmlFor="notes" className="text-base font-medium">Notas</Label>
                            <Textarea
                              id="notes"
                              {...form.register('notes')}
                              placeholder="Información adicional relevante para la cita (opcional)"
                              className="min-h-[120px]"
                            />
                          </div>
                          
                          <div className="space-y-6 pt-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                              <h3 className="font-medium text-green-800 mb-2 flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                                Resumen de la Cita
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                <div>
                                  <span className="text-slate-500 block">Paciente:</span>
                                  <span className="font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Especialista:</span>
                                  <span className="font-medium">
                                    {form.watch('specialistId') && specialists 
                                      ? specialists.find(s => String(s.id) === form.watch('specialistId'))?.name 
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Fecha:</span>
                                  <span className="font-medium">
                                    {form.watch('date') 
                                      ? format(new Date(form.watch('date')), 'dd/MM/yyyy')
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Hora:</span>
                                  <span className="font-medium">{form.watch('time') || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setStep(2)}
                            >
                              Anterior
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewAppointmentDialog(false)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                              >
                                Programar Cita
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </form>
                    </div>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          )}
          
          {/* Appointments Table in Card */}
          <Card className="overflow-hidden border-2 border-primary/10 shadow-md">
            <CardHeader className="bg-white border-b p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Citas Programadas</CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por paciente o especialista"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-64 h-9"
                    />
                  </div>
                  
                  {/* Status Filter Tabs */}
                  <div className="flex items-center">
                    <Select
                      value={filterStatus}
                      onValueChange={(value: 'all' | 'scheduled' | 'in_progress' | 'paused' | 'completed') => setFilterStatus(value)}
                    >
                      <SelectTrigger className="h-9 w-[180px]">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                            Programadas
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                            En progreso
                          </div>
                        </SelectItem>
                        <SelectItem value="paused">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                            Pausadas
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            Completadas
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Clear filters button (only show when filters are active) */}
                    {(filterStatus !== 'all' || searchTerm) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => {
                          setFilterStatus('all');
                          setSearchTerm('');
                          setFilters({});
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {isLoadingAppointments ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-12 w-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No hay citas disponibles</h3>
                  <p className="text-slate-500 max-w-md">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'No se encontraron citas con los filtros seleccionados. Intenta cambiar tus criterios de búsqueda.' 
                      : 'No hay citas programadas en este momento. Puedes crear una nueva cita usando el botón arriba.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableHead className="font-medium">Paciente</TableHead>
                        <TableHead className="font-medium">Especialista</TableHead>
                        <TableHead className="font-medium">Fecha</TableHead>
                        <TableHead className="font-medium">Hora</TableHead>
                        <TableHead className="font-medium">Estado</TableHead>
                        <TableHead className="font-medium text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => {
                        const statusStyles = getStatusStyles(appointment.status);
                        
                        return (
                          <TableRow 
                            key={appointment.id}
                            className="border-b hover:bg-slate-50/80 cursor-pointer"
                            onClick={() => {
                              if (user?.role === 'specialist') {
                                navigate(`/specialist/appointments/${appointment.id}`);
                              } else if (user?.role === 'admin') {
                                navigate(`/admin/appointments/${appointment.id}`);
                              } else {
                                navigate(`/receptionist/appointments/${appointment.id}`);
                              }
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                  <User className="h-4 w-4 text-slate-500" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {appointment.patient.first_name} {appointment.patient.last_name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    ID: {appointment.patient.identification || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-slate-400" />
                                <span>{appointment.specialist.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {appointment.scheduled_at
                                ? formatDate(appointment.scheduled_at)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              {appointment.scheduled_at
                                ? new Date(appointment.scheduled_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text} border ${statusStyles.border}`}>
                                {statusStyles.icon}
                                {getStatusLabel(appointment.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (user?.role === 'specialist') {
                                      navigate(`/specialist/appointments/${appointment.id}`);
                                    } else if (user?.role === 'admin') {
                                      navigate(`/admin/appointments/${appointment.id}`);
                                    } else {
                                      navigate(`/receptionist/appointments/${appointment.id}`);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {user?.role !== 'specialist' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Pagination Section */}
              {meta && filteredAppointments.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-t bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Mostrar</span>
                    <Select
                      value={String(perPage)}
                      onValueChange={(value) => {
                        setPerPage(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] rounded-md border">
                        <SelectValue placeholder={perPage} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-600">por página</span>
                  </div>
                  
                  <Pagination
                    currentPage={page}
                    totalPages={meta.last_page[0]}
                    onPageChange={setPage}
                  />
                  
                  <div className="text-sm text-slate-600 whitespace-nowrap">
                    Mostrando {meta.from[0]} a {meta.to[0]} de {meta.total[0]} resultados
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Appointments; 