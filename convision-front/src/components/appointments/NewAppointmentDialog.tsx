import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isBefore, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Search, X, Loader2, User, Stethoscope, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, Plus, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { cn, formatTimeFrom24hClock } from '@/lib/utils';
import { appointmentsService } from '@/services/appointmentsService';
import { branchService } from '@/services/branchService';
import ApiService from '@/services/ApiService';

const TIME_SLOTS = ['8:00', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

function padTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
}

function isTimeInPast(date: Date, time: string): boolean {
  if (!isSameDay(date, new Date())) return false;
  const [h, m] = time.split(':').map(Number);
  const selected = new Date();
  selected.setHours(h, m, 0, 0);
  return selected <= new Date();
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
type Props = { open: boolean; onOpenChange: (open: boolean) => void; };

const STEPS = ['Paciente', 'Especialista', 'Fecha y hora', 'Resumen'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

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

export default function NewAppointmentDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const now = new Date();
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listAll(),
  });

  const branchOptions = useMemo(
    () => branches.filter(b => b.is_active).map(b => ({ value: String(b.id), label: b.name })),
    [branches],
  );

  const selectedBranchName = useMemo(
    () => branches.find(b => String(b.id) === selectedBranchId)?.name ?? '',
    [branches, selectedBranchId],
  );

  const newPatientForm = useForm<NewPatientValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: { first_name: '', last_name: '', identification: '', email: '', phone: '', birth_date: '', gender: 'male' },
  });

  const { data: specialists = [], isLoading: loadingSpecialists } = useQuery({
    queryKey: ['specialists', selectedBranchId],
    queryFn: () => appointmentsService.getSpecialists(selectedBranchId ? Number(selectedBranchId) : undefined),
  });

  const { data: patientOptions = [], isLoading: loadingPatients, refetch: refetchPatients } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => patientSearch.length >= 3 ? appointmentsService.searchPatients(patientSearch) : Promise.resolve([]),
    enabled: false,
  });

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

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setPatientSearch('');
      setSelectedPatient(null);
      setSelectedSpecialist(null);
      setSpecialistSearch('');
      setSelectedDate(now);
      setSelectedTime('');
      setNotes('');
      setShowNewPatientForm(false);
      setSelectedBranchId('');
      newPatientForm.reset();
    }, 200);
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
      await ApiService.post('/api/v1/appointments', {
        specialist_id: selectedSpecialist.id,
        patient_id: selectedPatient.id,
        scheduled_at: `${dateStr} ${padTime(selectedTime)}`,
        branch_id: selectedBranchId ? Number(selectedBranchId) : undefined,
        notes,
      });
      toast({ title: 'Cita creada', description: 'La cita ha sido programada exitosamente.' });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      handleClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const serverErrors = apiError?.response?.data?.errors;
      const serverMessage = apiError?.response?.data?.message;
      let description = 'No se pudo crear la cita. Verifica los datos e intenta de nuevo.';
      if (serverErrors) {
        const firstField = Object.values(serverErrors)[0];
        if (firstField?.[0]) description = firstField[0];
      } else if (serverMessage) {
        description = serverMessage;
      }
      toast({ variant: 'destructive', title: 'Error al crear la cita', description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSpecialists = specialists.filter(s =>
    !specialistSearch || s.name.toLowerCase().includes(specialistSearch.toLowerCase())
  );

  const showPatientResults = patientSearch.length >= 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] p-0 gap-0 flex flex-col max-h-[95vh]">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-[18px] font-bold text-[#121215]">Nueva cita</DialogTitle>
          <p className="text-[13px] text-[#7d7d87] mt-0.5">Completa los datos para agendar una nueva cita</p>
        </DialogHeader>

        <div className="border-b border-[#e5e5e9]">
          <StepIndicator current={step} total={STEPS.length} />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {step === 0 && (
            <div className="px-6 py-5 space-y-4">
              {branchOptions.length > 1 && (
                <div className="space-y-2 pb-4 border-b border-[#f5f5f6]">
                  <Label className="text-[13px] font-semibold text-[#121215] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#7d7d87]" />
                    Sede de la cita
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {branchOptions.map((b) => {
                      const isSelected = selectedBranchId === b.value;
                      return (
                        <button
                          key={b.value}
                          type="button"
                          className={cn(
                            'px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors',
                            isSelected
                              ? 'border-convision-primary bg-convision-light text-convision-primary'
                              : 'border-[#e5e5e9] bg-white text-[#59687a] hover:border-convision-primary/40',
                          )}
                          onClick={() => setSelectedBranchId(isSelected ? '' : b.value)}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                      ← Volver a buscar
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
                      onChange={e => setSelectedTime(e.target.value)}
                      className="h-10 text-[15px] font-semibold text-center border-[#e5e5e9]"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#7d7d87] mb-2 font-medium uppercase tracking-wide">Horarios sugeridos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TIME_SLOTS.map(slot => {
                        const isPast = isTimeInPast(selectedDate, padTime(slot));
                        return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isPast}
                          onClick={() => !isPast && setSelectedTime(padTime(slot))}
                          className={cn(
                            'px-2.5 py-1 text-[12px] font-medium rounded-md border transition-colors',
                            isPast
                              ? 'bg-[#f5f5f6] border-[#e5e5e9] text-[#c0c0c5] cursor-not-allowed line-through'
                              : selectedTime === padTime(slot)
                                ? 'bg-convision-primary border-convision-primary text-white'
                                : 'bg-white border-[#e5e5e9] text-[#59687a] hover:border-convision-primary hover:text-convision-primary',
                          )}
                        >
                          {formatTimeFrom24hClock(padTime(slot))}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                  {selectedTime && selectedDate && !isTimeInPast(selectedDate, selectedTime) && (
                    <div className="bg-convision-light border border-convision-primary/30 rounded-lg px-3 py-2.5 text-[12px] text-[#1e3a6e]">
                      <CheckCircle2 className="inline h-3.5 w-3.5 mr-1.5 text-convision-primary" />
                      {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })} a las {formatTimeFrom24hClock(selectedTime)}
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
                  {selectedBranchName && (
                    <div className="px-5 py-4">
                      <p className="text-[11px] text-[#7d7d87] font-medium uppercase tracking-wide mb-1">Sede</p>
                      <p className="text-[14px] font-semibold text-[#121215]">{selectedBranchName}</p>
                    </div>
                  )}
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

              <div className="flex items-start gap-2 bg-[#fffbea] border border-[#fde68a] rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-[#d97706] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#92400e]">
                  Al confirmar, la cita quedará en estado <strong>Agendada</strong> y aparecerá en el listado.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#e5e5e9] px-6 py-4 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[13px]"
                onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-9 px-4 text-[13px] text-[#7d7d87] hover:text-[#121215]"
              onClick={handleClose}>
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
                (step === 2 && (!selectedDate || !selectedTime || isTimeInPast(selectedDate, selectedTime)))
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirmar cita
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
