import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isBefore, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, X, Loader2, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, Plus, User, MapPin, Shield, Briefcase, StickyNote, Info,
} from 'lucide-react';
import PageLayout from '@/components/layouts/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { cn, formatTimeFrom24hClock, parseLocalDatetime } from '@/lib/utils';
import ApiService from '@/services/ApiService';
import { appointmentsService } from '@/services/appointmentsService';

const TIME_SLOTS = ['8:00', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const STEPS = ['Paciente', 'Especialista', 'Fecha y hora', 'Resumen'];

function padTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
}

function normalizeTimeInput(time: string): string {
  const value = time.trim();
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return '';
  }
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
  if (!ampm) return '';
  let h = Number(ampm[1]);
  const m = Number(ampm[2]);
  const period = ampm[3].toUpperCase();
  if (Number.isNaN(h) || Number.isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return '';
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isTimeInPast(date: Date, time: string): boolean {
  const normalized = normalizeTimeInput(time);
  if (!normalized) return true;
  if (!isSameDay(date, new Date())) return false;
  const [h, m] = normalized.split(':').map(Number);
  const selected = new Date();
  selected.setHours(h, m, 0, 0);
  return selected <= new Date();
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const newPatientSchema = z.object({
  first_name: z.string().min(2, 'Mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Mínimo 2 caracteres'),
  identification: z.string().min(5, 'Mínimo 5 caracteres'),
  email: z.string().email('Correo inválido'),
  phone: z.string().min(7, 'Mínimo 7 dígitos'),
  birth_date: z.string().min(1, 'Requerido'),
  gender: z.enum(['male', 'female', 'other']),
});

type NewPatientValues = z.infer<typeof newPatientSchema>;
type Patient = { id: number; first_name: string; last_name: string; identification: string; email: string; phone?: string; };
type Specialist = { id: number; name: string; identification?: string; role: string; };

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-8 py-4">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 w-[110px]">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                  done && 'bg-convision-primary border-convision-primary text-white',
                  active && 'bg-white border-convision-primary text-convision-primary',
                  !done && !active && 'bg-white border-[#d1d5db] text-[#9ca3af]',
                )}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium text-center leading-tight',
                  active ? 'text-convision-primary' : done ? 'text-convision-primary' : 'text-[#9ca3af]',
                )}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mt-[-12px]',
                  i < current ? 'bg-convision-primary' : 'bg-[#e5e7eb]',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PatientChip({ patient, onClear }: { patient: Patient; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-convision-light border border-convision-primary/30 rounded-full px-3 py-1.5 text-sm">
      <div className="w-5 h-5 rounded-full bg-convision-primary flex items-center justify-center text-white text-[9px] font-bold shrink-0">
        {getInitials(`${patient.first_name} ${patient.last_name}`)}
      </div>
      <span className="font-medium text-[#1e3a6e]">{patient.first_name} {patient.last_name}</span>
      {onClear && (
        <button type="button" onClick={onClear} className="ml-1 text-[#7d9ad3] hover:text-[#1e3a6e]">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function SpecialistChip({ specialist }: { specialist: Specialist }) {
  return (
    <div className="flex items-center gap-2 bg-convision-light border border-convision-primary/30 rounded-full px-3 py-1.5 text-sm">
      <div className="w-5 h-5 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
        {getInitials(specialist.name)}
      </div>
      <span className="font-medium text-[#1e3a6e]">{specialist.name}</span>
    </div>
  );
}

const AppointmentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = useMemo(() => Boolean(id), [id]);
  const now = useMemo(() => new Date(), []);

  const [step, setStep] = useState(0);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [specialistSearch, setSpecialistSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  const newPatientForm = useForm<NewPatientValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: { first_name: '', last_name: '', identification: '', email: '', phone: '', birth_date: '', gender: 'male' },
  });

  const { data: specialists = [], isLoading: loadingSpecialists } = useQuery({
    queryKey: ['specialists'],
    queryFn: appointmentsService.getSpecialists,
  });

  const { data: patientOptions = [], isLoading: loadingPatients, refetch: refetchPatients } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => patientSearch.length >= 3 ? appointmentsService.searchPatients(patientSearch) : Promise.resolve([]),
    enabled: false,
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: bookedSlots = [] } = useQuery({
    queryKey: ['booked-slots', selectedSpecialist?.id, selectedDateStr],
    queryFn: () => appointmentsService.getBookedSlots(selectedSpecialist!.id, selectedDateStr),
    enabled: Boolean(selectedSpecialist?.id),
    staleTime: 30_000,
  });

  const isSlotBooked = (time: string): boolean => {
    const normalized = normalizeTimeInput(padTime(time));
    if (!normalized) return false;
    const editId = isEdit && id ? Number(id) : 0;
    return bookedSlots.some(booked => {
      if (editId > 0 && selectedTime === normalized) return false;
      return booked === normalized;
    });
  };

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!isEdit || !id) return;
      setLoadingAppointment(true);
      try {
        const appointment = await appointmentsService.getAppointmentById(Number(id));
        setSelectedPatient(appointment.patient);
        setSelectedSpecialist(appointment.specialist);
        const parsedDate = parseLocalDatetime(appointment.scheduled_at);
        if (parsedDate) {
          setSelectedDate(parsedDate);
          setSelectedTime(format(parsedDate, 'HH:mm'));
        }
        setNotes(appointment.notes ?? '');
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la cita para edición.' });
        navigate('/receptionist/appointments');
      } finally {
        setLoadingAppointment(false);
      }
    };
    fetchAppointment();
  }, [id, isEdit, navigate]);

  const handlePatientSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientSearch(val);
    setSelectedPatient(null);
    if (val.length >= 3) setTimeout(() => refetchPatients(), 300);
  }, [refetchPatients]);

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientSearch('');
    setShowNewPatientForm(false);
  };

  const handleCreatePatient = async (values: NewPatientValues) => {
    setIsCreatingPatient(true);
    try {
      const res = await ApiService.post('/api/v1/patients', { ...values, identification_type: 'dni' });
      const created = (res as { data?: Patient } & Patient).data ?? res as Patient;
      selectPatient(created);
      toast({ title: 'Paciente creado', description: `${created.first_name} ${created.last_name} fue registrado.` });
      setShowNewPatientForm(false);
      newPatientForm.reset();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el paciente.' });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedSpecialist || !selectedTime) return;
    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const normalizedTime = normalizeTimeInput(selectedTime);
      if (!normalizedTime) {
        toast({ variant: 'destructive', title: 'Hora inválida', description: 'Selecciona una hora válida para continuar.' });
        setIsSubmitting(false);
        return;
      }
      const payload = {
        specialist_id: selectedSpecialist.id,
        patient_id: selectedPatient.id,
        scheduled_at: `${dateStr} ${padTime(normalizedTime)}`,
        notes,
      };

      if (isEdit && id) {
        await ApiService.put(`/api/v1/appointments/${id}`, payload);
        toast({ title: 'Cita actualizada', description: 'Los cambios se guardaron correctamente.' });
      } else {
        await ApiService.post('/api/v1/appointments', payload);
        toast({ title: 'Cita creada', description: 'La cita ha sido programada exitosamente.' });
      }

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/receptionist/appointments');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const serverErrors = apiError?.response?.data?.errors;
      const serverMessage = apiError?.response?.data?.message;
      let description = isEdit
        ? 'No se pudo actualizar la cita. Verifica los datos e intenta de nuevo.'
        : 'No se pudo crear la cita. Verifica los datos e intenta de nuevo.';
      if (serverErrors) {
        const firstField = Object.values(serverErrors)[0];
        if (firstField?.[0]) description = firstField[0];
      } else if (serverMessage) {
        description = serverMessage;
      }
      toast({ variant: 'destructive', title: isEdit ? 'Error al actualizar la cita' : 'Error al crear la cita', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSpecialists = specialists.filter(s =>
    !specialistSearch || s.name.toLowerCase().includes(specialistSearch.toLowerCase())
  );

  const showPatientResults = patientSearch.length >= 3;

  const ASIDE_STEPS = [
    { label: 'Paciente', icon: User },
    { label: 'Especialista', icon: Briefcase },
    { label: 'Fecha y hora', icon: MapPin },
    { label: 'Resumen', icon: StickyNote },
  ];

  return (
    <PageLayout
      title={isEdit ? 'Editar Cita' : 'Nueva Cita'}
      subtitle={isEdit ? 'Recepción / Editar Cita' : 'Recepción / Nueva Cita'}
      topbarClassName="h-auto min-h-[56px] py-3"
      titleStackClassName="gap-1"
      actions={(
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-w-[120px]" onClick={() => navigate('/receptionist/appointments')}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="min-w-[140px] bg-convision-primary text-white hover:bg-convision-dark"
            disabled={step !== 3 || isSubmitting || loadingAppointment}
            onClick={handleSubmit}
          >
            {isEdit ? 'Guardar cambios' : 'Crear cita'}
          </Button>
        </div>
      )}
    >
      <div className="flex min-h-[calc(100%-2rem)] w-full flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="min-w-0 flex-1 overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <div className="border-b border-[#e5e5e9] bg-[#fafafb] px-0">
            <div className="inline-flex h-12 items-center border-b-2 border-convision-primary bg-white px-5">
              <span className="text-[12px] font-semibold text-[#0f0f12]">{isEdit ? 'Edición de cita' : 'Programación de cita'}</span>
            </div>
          </div>

        <CardContent className="p-0">
          {loadingAppointment ? (
            <div className="py-20 text-center text-[13px] text-[#7d7d87]">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Cargando cita...
            </div>
          ) : (
            <>
              <div className="border-b border-[#e5e5e9]">
                <StepIndicator current={step} total={STEPS.length} />
              </div>

              <div>
                {step === 0 && (
                  <div className="px-6 py-5 space-y-4">
                    {selectedPatient ? (
                      <div className="space-y-3">
                        <Label className="text-[13px] font-semibold text-[#121215]">Paciente seleccionado</Label>
                        <div className="flex items-center gap-3 p-4 bg-convision-light border border-convision-primary/30 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-convision-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {getInitials(`${selectedPatient.first_name} ${selectedPatient.last_name}`)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#121215]">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                            <p className="text-[12px] text-[#7d7d87]">CC {selectedPatient.identification}{selectedPatient.phone ? ` · ${selectedPatient.phone}` : ''}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" className="text-[#7d7d87] hover:text-red-500 h-8 w-8 p-0"
                            onClick={() => setSelectedPatient(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : showNewPatientForm ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] font-semibold text-[#121215]">Nuevo paciente</Label>
                          <Button type="button" variant="ghost" size="sm" className="text-[#7d7d87] h-7 px-2 text-[12px]"
                            onClick={() => setShowNewPatientForm(false)}>
                            Volver a buscar
                          </Button>
                        </div>
                        <form onSubmit={newPatientForm.handleSubmit(handleCreatePatient)} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[12px]">Nombre *</Label>
                              <Input {...newPatientForm.register('first_name')} className="h-9 text-[13px]" />
                              {newPatientForm.formState.errors.first_name && (
                                <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.first_name.message}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[12px]">Apellido *</Label>
                              <Input {...newPatientForm.register('last_name')} className="h-9 text-[13px]" />
                              {newPatientForm.formState.errors.last_name && (
                                <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.last_name.message}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[12px]">Identificación *</Label>
                              <Input {...newPatientForm.register('identification')} className="h-9 text-[13px]" />
                              {newPatientForm.formState.errors.identification && (
                                <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.identification.message}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[12px]">Teléfono *</Label>
                              <Input {...newPatientForm.register('phone')} className="h-9 text-[13px]" />
                              {newPatientForm.formState.errors.phone && (
                                <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.phone.message}</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[12px]">Correo electrónico *</Label>
                            <Input type="email" {...newPatientForm.register('email')} className="h-9 text-[13px]" />
                            {newPatientForm.formState.errors.email && (
                              <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.email.message}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[12px]">Fecha de nacimiento *</Label>
                              <Input type="date" {...newPatientForm.register('birth_date')} className="h-9 text-[13px]" />
                              {newPatientForm.formState.errors.birth_date && (
                                <p className="text-[11px] text-red-500">{newPatientForm.formState.errors.birth_date.message}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[12px]">Género *</Label>
                              <Select
                                defaultValue="male"
                                onValueChange={val => newPatientForm.setValue('gender', val as 'male' | 'female' | 'other')}
                              >
                                <SelectTrigger className="h-9 text-[13px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Masculino</SelectItem>
                                  <SelectItem value="female">Femenino</SelectItem>
                                  <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]"
                              onClick={() => setShowNewPatientForm(false)} disabled={isCreatingPatient}>
                              Cancelar
                            </Button>
                            <Button type="submit" size="sm" className="h-8 text-[12px] bg-convision-primary hover:bg-convision-dark" disabled={isCreatingPatient}>
                              {isCreatingPatient && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                              Crear paciente
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-[13px] font-semibold text-[#121215]">Buscar paciente</Label>
                          <p className="text-[12px] text-[#7d7d87] mt-0.5">Escribe el nombre, cédula o teléfono del paciente</p>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b4b5bc]" />
                          <Input
                            value={patientSearch}
                            onChange={handlePatientSearchChange}
                            placeholder="Ej: Laura Vega, 1020334455..."
                            className="pl-9 h-10 text-[13px] border-[#e5e5e9]"
                          />
                          {loadingPatients && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#b4b5bc]" />
                          )}
                          {patientSearch && !loadingPatients && (
                            <button type="button" onClick={() => setPatientSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b4b5bc] hover:text-[#59687a]">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {showPatientResults && (
                          <div className="border border-[#e5e5e9] rounded-lg bg-white shadow-sm overflow-hidden">
                            {loadingPatients ? (
                              <div className="p-4 text-center text-[13px] text-[#7d7d87]">Buscando...</div>
                            ) : patientOptions.length > 0 ? (
                              <>
                                <p className="text-[11px] text-[#7d7d87] px-4 pt-3 pb-1">
                                  {patientOptions.length} resultado{patientOptions.length !== 1 ? 's' : ''} encontrado{patientOptions.length !== 1 ? 's' : ''}
                                </p>
                                {patientOptions.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f6] transition-colors text-left border-t border-[#f5f5f6] first:border-t-0"
                                    onClick={() => selectPatient(p)}
                                  >
                                    <div className="w-8 h-8 rounded-full bg-convision-light flex items-center justify-center text-convision-primary text-[11px] font-bold shrink-0">
                                      {getInitials(`${p.first_name} ${p.last_name}`)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] font-medium text-[#121215]">{p.first_name} {p.last_name}</p>
                                      <p className="text-[11px] text-[#7d7d87]">CC {p.identification}{p.phone ? ` · ${p.phone}` : ''}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-[#b4b5bc] shrink-0" />
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-4 py-3 text-[13px] text-convision-primary hover:bg-convision-light border-t border-[#e5e5e9] font-medium"
                                  onClick={() => setShowNewPatientForm(true)}
                                >
                                  <Plus className="h-4 w-4" /> Crear nuevo paciente
                                </button>
                              </>
                            ) : (
                              <div className="p-4">
                                <p className="text-[13px] text-[#7d7d87] text-center mb-3">No se encontraron resultados</p>
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] text-convision-primary hover:bg-convision-light border border-convision-primary/30 rounded-lg font-medium"
                                  onClick={() => setShowNewPatientForm(true)}
                                >
                                  <Plus className="h-4 w-4" /> Crear nuevo paciente
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="px-6 py-5 space-y-4">
                    {selectedPatient && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#7d7d87]">Paciente:</span>
                        <PatientChip patient={selectedPatient} />
                      </div>
                    )}
                    <div className="space-y-3">
                      <Label className="text-[13px] font-semibold text-[#121215]">Seleccionar especialista</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b4b5bc]" />
                        <Input
                          value={specialistSearch}
                          onChange={e => { setSpecialistSearch(e.target.value); }}
                          placeholder="Filtrar por nombre..."
                          className="pl-9 h-9 text-[13px] border-[#e5e5e9]"
                        />
                      </div>
                      {loadingSpecialists ? (
                        <div className="text-center py-6 text-[13px] text-[#7d7d87]">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                          Cargando especialistas...
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto py-0.5 pr-0.5">
                          {filteredSpecialists.map(s => {
                            const isSelected = selectedSpecialist?.id === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                className={cn(
                                  'flex items-center gap-3 p-3.5 border rounded-lg text-left transition-all',
                                  isSelected
                                    ? 'border-convision-primary bg-convision-light shadow-sm'
                                    : 'border-[#e5e5e9] bg-white hover:border-convision-primary/40 hover:bg-convision-light/50',
                                )}
                                onClick={() => setSelectedSpecialist(isSelected ? null : s)}
                              >
                                <div className={cn(
                                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                                  isSelected ? 'bg-convision-primary text-white' : 'bg-[#f5f5f6] text-[#59687a]',
                                )}>
                                  {getInitials(s.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-[13px] font-semibold truncate', isSelected ? 'text-[#1e3a6e]' : 'text-[#121215]')}>
                                    {s.name}
                                  </p>
                                  <p className="text-[11px] text-[#7d7d87]">Especialista</p>
                                </div>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-convision-primary shrink-0" />}
                              </button>
                            );
                          })}
                          {filteredSpecialists.length === 0 && (
                            <div className="col-span-2 text-center py-6 text-[13px] text-[#7d7d87]">
                              No se encontraron especialistas
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {selectedPatient && <PatientChip patient={selectedPatient} />}
                      {selectedSpecialist && <SpecialistChip specialist={selectedSpecialist} />}
                    </div>

                    <div className="grid grid-cols-[1fr_1px_240px] gap-6">
                      <div className="space-y-2">
                        <Label className="text-[13px] font-semibold text-[#121215]">Fecha de la cita</Label>
                        <UiCalendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={d => {
                            if (!d || isBefore(d, startOfDay(now))) return;
                            setSelectedDate(d);
                            if (selectedTime && isTimeInPast(d, selectedTime)) setSelectedTime('');
                          }}
                          disabled={d => isBefore(d, startOfDay(now))}
                          className="border border-[#e5e5e9] rounded-lg p-2 w-full"
                        />
                      </div>

                      <div className="bg-[#e5e5e9]" />

                      <div className="space-y-3">
                        <Label className="text-[13px] font-semibold text-[#121215]">Hora</Label>
                        <div className="space-y-1">
                          <Input
                            type="time"
                            value={selectedTime}
                            onChange={e => setSelectedTime(normalizeTimeInput(e.target.value))}
                            className="h-10 text-[15px] font-semibold text-center border-[#e5e5e9]"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#7d7d87] mb-2 font-medium uppercase tracking-wide">Horarios sugeridos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {TIME_SLOTS.map(slot => {
                              const normalized = normalizeTimeInput(padTime(slot));
                              const isPast = isTimeInPast(selectedDate, padTime(slot));
                              const isBooked = isSlotBooked(slot);
                              const isDisabled = isPast || isBooked;
                              const isSelected = selectedTime === normalized;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isDisabled}
                                  title={isBooked ? 'Horario ocupado para este especialista' : undefined}
                                  onClick={() => !isDisabled && setSelectedTime(normalized)}
                                  className={cn(
                                    'px-2.5 py-1 text-[12px] font-medium rounded-md border transition-colors',
                                    isBooked && !isSelected
                                      ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through'
                                      : isPast
                                        ? 'bg-[#f5f5f6] border-[#e5e5e9] text-[#c0c0c5] cursor-not-allowed line-through'
                                        : isSelected
                                          ? 'bg-convision-primary border-convision-primary text-white'
                                          : 'bg-white border-[#e5e5e9] text-[#59687a] hover:border-convision-primary hover:text-convision-primary',
                                  )}
                                >
                                  {formatTimeFrom24hClock(padTime(slot))}
                                </button>
                              );
                            })}
                          </div>
                          {bookedSlots.length > 0 && (
                            <p className="text-[11px] text-[#7d7d87] mt-2">
                              <span className="inline-block w-2.5 h-2.5 bg-red-200 border border-red-300 rounded-sm mr-1 align-middle" />
                              Horarios en rojo ya están ocupados para {selectedSpecialist?.name}
                            </p>
                          )}
                        </div>
                        {selectedTime && selectedDate && !isTimeInPast(selectedDate, selectedTime) && !bookedSlots.includes(selectedTime) && (
                          <div className="bg-convision-light border border-convision-primary/30 rounded-lg px-3 py-2.5 text-[12px] text-[#1e3a6e]">
                            <CheckCircle2 className="inline h-3.5 w-3.5 mr-1.5 text-convision-primary" />
                            {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })} a las {formatTimeFrom24hClock(selectedTime)}
                          </div>
                        )}
                        {selectedTime && bookedSlots.includes(selectedTime) && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[12px] text-red-700">
                            <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 text-red-500" />
                            Este horario ya está ocupado para {selectedSpecialist?.name}. Elige otro.
                          </div>
                        )}
                        {selectedTime && selectedDate && isTimeInPast(selectedDate, selectedTime) && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[12px] text-red-700">
                            <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 text-red-500" />
                            La hora seleccionada ya pasó. Por favor elige una hora futura.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="px-6 py-5 space-y-4">
                    <div className="border border-[#e5e5e9] rounded-lg overflow-hidden">
                      <div className="bg-[#f5f5f6] px-5 py-3 border-b border-[#e5e5e9]">
                        <p className="text-[14px] font-semibold text-[#121215]">Resumen de la cita</p>
                      </div>
                      <div className="divide-y divide-[#f5f5f6]">
                        <div className="px-5 py-4">
                          <p className="text-[11px] text-[#7d7d87] font-medium uppercase tracking-wide mb-1">Paciente</p>
                          <p className="text-[14px] font-semibold text-[#121215]">{selectedPatient?.first_name} {selectedPatient?.last_name}</p>
                          {selectedPatient && (
                            <p className="text-[12px] text-[#7d7d87]">CC {selectedPatient.identification}{selectedPatient.phone ? ` · ${selectedPatient.phone}` : ''}</p>
                          )}
                        </div>
                        <div className="px-5 py-4">
                          <p className="text-[11px] text-[#7d7d87] font-medium uppercase tracking-wide mb-1">Especialista</p>
                          <p className="text-[14px] font-semibold text-[#121215]">{selectedSpecialist?.name}</p>
                          <p className="text-[12px] text-[#7d7d87]">Especialista</p>
                        </div>
                        <div className="px-5 py-4">
                          <p className="text-[11px] text-[#7d7d87] font-medium uppercase tracking-wide mb-1">Fecha y hora</p>
                          <p className="text-[14px] font-semibold text-[#121215]">
                            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                          </p>
                          <p className="text-[12px] text-[#7d7d87]">{formatTimeFrom24hClock(selectedTime)}</p>
                        </div>
                        {notes && (
                          <div className="px-5 py-4">
                            <p className="text-[11px] text-[#7d7d87] font-medium uppercase tracking-wide mb-1">Motivo</p>
                            <p className="text-[13px] text-[#121215]">{notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold text-[#121215]">Notas adicionales</Label>
                      <Textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Motivo de la consulta, observaciones..."
                        className="min-h-[80px] text-[13px] border-[#e5e5e9] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[#e5e5e9] px-6 py-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  {step > 0 && (
                    <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[13px]"
                      onClick={() => setStep(s => s - 1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="h-9 px-4 text-[13px] text-[#7d7d87] hover:text-[#121215]"
                    onClick={() => navigate('/receptionist/appointments')}>
                    Cancelar
                  </Button>
                </div>

                {step < 3 && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-5 text-[13px] bg-convision-primary hover:bg-convision-dark text-white font-semibold"
                    disabled={
                      (step === 0 && !selectedPatient) ||
                      (step === 1 && !selectedSpecialist) ||
                      (step === 2 && (
                        !selectedDate ||
                        !selectedTime ||
                        isTimeInPast(selectedDate, selectedTime) ||
                        bookedSlots.includes(selectedTime)
                      ))
                    }
                    onClick={() => setStep(s => s + 1)}
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-5 text-[13px] bg-convision-primary hover:bg-convision-dark text-white font-semibold"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isEdit ? 'Guardar cambios' : 'Confirmar cita'}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
        </Card>

        <aside className="w-full shrink-0 space-y-4 lg:w-[340px]">
          <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
            <div className="flex h-[52px] items-center gap-2.5 border-b border-[#e5e5e9] px-5">
              <StickyNote className="h-[14px] w-[14px] text-[#7d7d87]" />
              <span className="text-[13px] font-semibold text-[#121215]">Progreso del formulario</span>
            </div>
            <div className="space-y-0 py-1">
              {ASIDE_STEPS.map((s, i) => {
                const isDone = i < step;
                const isActive = i === step;
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3',
                      isActive && 'bg-convision-light',
                    )}
                  >
                    <Icon className={cn('h-3 w-3 shrink-0', isDone || isActive ? 'text-convision-primary' : 'text-[#b4b5bc]')} />
                    <span className={cn('flex-1 text-[12px] leading-none', isDone || isActive ? 'font-semibold text-convision-primary' : 'text-[#7d7d87]')}>
                      {s.label}
                    </span>
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-convision-primary shrink-0" />}
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-convision-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="rounded-lg border border-convision-primary/25 bg-convision-light p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="h-[14px] w-[14px] text-convision-primary shrink-0" />
              <span className="text-[12px] font-semibold text-convision-primary">
                {isEdit ? 'Modo edición' : 'Confirma antes de guardar'}
              </span>
            </div>
            <p className="text-[12px] leading-5 text-[#59687a]">
              {isEdit
                ? 'Puedes modificar el paciente, especialista, fecha/hora y notas. Los cambios se guardan al confirmar.'
                : 'Revisa el resumen antes de crear la cita. El paciente recibirá su cita en estado Agendada.'}
            </p>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
};

export default AppointmentFormPage;
