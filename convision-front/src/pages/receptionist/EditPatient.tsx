import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import {
  User,
  MapPin,
  Shield,
  Briefcase,
  FileText,
  CheckCircle2,
  ArrowRight,
  Info,
  Lock,
  AlertTriangle,
  Loader2,
  Camera,
} from 'lucide-react';
import api from '@/lib/axios';
import { patientLookupService } from '@/services/patientLookupService';
import type {
  IdentificationType,
  Country,
  Department,
  City,
  District,
  HealthInsuranceProvider,
  AffiliationType,
  CoverageType,
  EducationLevel,
} from '@/services/patientLookupService';
import { patientService } from '@/services/patientService';

const STEPS = [
  { key: 'personal', label: 'Información personal', icon: User },
  { key: 'ubicacion', label: 'Ubicación', icon: MapPin },
  { key: 'seguro', label: 'Seguro médico', icon: Shield },
  { key: 'laboral', label: 'Laboral / Educativo', icon: Briefcase },
  { key: 'notas', label: 'Notas', icon: FileText },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

const patientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  identification_type: z.string().optional(),
  identification: z.string().min(5, 'La identificación debe tener al menos 5 caracteres'),
  birth_date: z.string().min(1, 'La fecha de nacimiento es requerida'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  gender: z.enum(['male', 'female', 'other']),
  status: z.boolean().default(true),
  address: z.string().optional(),
  country_id: z.string().optional(),
  department_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  neighborhood: z.string().optional(),
  postal_code: z.string().optional(),
  health_insurance_id: z.string().optional(),
  affiliation_type_id: z.string().optional(),
  coverage_type_id: z.string().optional(),
  policy_number: z.string().optional(),
  occupation: z.string().optional(),
  position: z.string().optional(),
  company: z.string().optional(),
  education_level_id: z.string().optional(),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const STEP_REQUIRED_FIELDS: Record<StepKey, (keyof PatientFormValues)[]> = {
  personal: ['first_name', 'last_name', 'identification', 'birth_date', 'phone', 'email', 'gender'],
  ubicacion: [],
  seguro: [],
  laboral: [],
  notas: [],
};

const EditPatient: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams<{ patientId: string }>();
  const { toast } = useToast();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const patientsListPath = isAdminRoute ? '/admin/patients' : '/receptionist/patients';

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [existingProfileUrl, setExistingProfileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [healthInsuranceProviders, setHealthInsuranceProviders] = useState<HealthInsuranceProvider[]>([]);
  const [affiliationTypes, setAffiliationTypes] = useState<AffiliationType[]>([]);
  const [coverageTypes, setCoverageTypes] = useState<CoverageType[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      identification_type: '',
      identification: '',
      birth_date: '',
      phone: '',
      email: '',
      gender: undefined,
      status: true,
      address: '',
      country_id: '',
      department_id: '',
      city_id: '',
      district_id: '',
      neighborhood: '',
      postal_code: '',
      health_insurance_id: '',
      affiliation_type_id: '',
      coverage_type_id: '',
      policy_number: '',
      occupation: '',
      position: '',
      company: '',
      education_level_id: '',
      notes: '',
    },
  });

  const countryId = watch('country_id');
  const departmentId = watch('department_id');
  const cityId = watch('city_id');
  const birthDate = watch('birth_date');
  const notes = watch('notes') || '';
  const statusActive = watch('status');
  const firstName = watch('first_name');
  const lastName = watch('last_name');
  const genderValue = watch('gender');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [lookupData, countriesData, patientResponse] = await Promise.all([
          patientLookupService.getAllLookupData(),
          patientLookupService.getCountries(),
          api.get(`/api/v1/patients/${patientId}`),
        ]);

        setIdentificationTypes(lookupData.identification_types);
        setHealthInsuranceProviders(lookupData.health_insurance_providers);
        setAffiliationTypes(lookupData.affiliation_types);
        setCoverageTypes(lookupData.coverage_types);
        setEducationLevels(lookupData.education_levels);
        setCountries(countriesData);

        const patient = patientResponse.data?.data ?? patientResponse.data;

        if (patient.profile_image) {
          setExistingProfileUrl(patientService.getProfileImageUrl(patient.id));
        }

        if (patient.country_id) {
          const deps = await patientLookupService.getDepartments(Number(patient.country_id));
          setDepartments(deps);
        }
        if (patient.department_id) {
          const cts = await patientLookupService.getCities(Number(patient.department_id));
          setCities(cts);
        }
        if (patient.city_id) {
          const dists = await patientLookupService.getDistricts(Number(patient.city_id));
          setDistricts(dists);
        }

        reset({
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          identification_type: patient.identification_type_id ? String(patient.identification_type_id) : '',
          identification: patient.identification || '',
          birth_date: patient.birth_date || '',
          phone: patient.phone || '',
          email: patient.email || '',
          gender: (patient.gender as 'male' | 'female' | 'other') || undefined,
          status: patient.status === 'active',
          address: patient.address || '',
          country_id: patient.country_id ? String(patient.country_id) : '',
          department_id: patient.department_id ? String(patient.department_id) : '',
          city_id: patient.city_id ? String(patient.city_id) : '',
          district_id: patient.district_id ? String(patient.district_id) : '',
          neighborhood: patient.neighborhood || '',
          postal_code: patient.postal_code || '',
          health_insurance_id: patient.health_insurance_provider_id ? String(patient.health_insurance_provider_id) : '',
          affiliation_type_id: patient.affiliation_type_id ? String(patient.affiliation_type_id) : '',
          coverage_type_id: patient.coverage_type_id ? String(patient.coverage_type_id) : '',
          policy_number: patient.policy_number || '',
          occupation: patient.occupation || '',
          position: patient.position || '',
          company: patient.company || '',
          education_level_id: patient.education_level_id ? String(patient.education_level_id) : '',
          notes: patient.notes || '',
        });

        setCompletedSteps(new Set([0, 1, 2, 3, 4]));
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del paciente.' });
        navigate(patientsListPath);
      } finally {
        setIsLoading(false);
      }
    };

    if (patientId) loadData();
  }, [patientId]);

  useEffect(() => {
    if (isLoading) return;
    if (!countryId) { setDepartments([]); setValue('department_id', ''); return; }
    patientLookupService.getDepartments(Number(countryId)).then(setDepartments).catch(() => setDepartments([]));
  }, [countryId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!departmentId) { setCities([]); setValue('city_id', ''); return; }
    patientLookupService.getCities(Number(departmentId)).then(setCities).catch(() => setCities([]));
  }, [departmentId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!cityId) { setDistricts([]); setValue('district_id', ''); return; }
    patientLookupService.getDistricts(Number(cityId)).then(setDistricts).catch(() => setDistricts([]));
  }, [cityId, isLoading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Error', description: 'La imagen no debe superar 2 MB.' });
      return;
    }
    setProfileImageFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'EP';
  };

  const goToStep = async (targetStep: number) => {
    if (targetStep > currentStep) {
      const fieldsToValidate = STEP_REQUIRED_FIELDS[STEPS[currentStep].key];
      if (fieldsToValidate.length > 0) {
        const valid = await trigger(fieldsToValidate);
        if (!valid) return;
      }
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
    }
    setCurrentStep(targetStep);
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      await goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name,
        identification: data.identification,
        identification_type_id: data.identification_type ? Number(data.identification_type) : undefined,
        birth_date: data.birth_date,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        status: data.status ? 'active' : 'inactive',
        address: data.address || undefined,
        country_id: data.country_id ? Number(data.country_id) : undefined,
        department_id: data.department_id ? Number(data.department_id) : undefined,
        city_id: data.city_id ? Number(data.city_id) : undefined,
        district_id: data.district_id ? Number(data.district_id) : undefined,
        neighborhood: data.neighborhood || undefined,
        postal_code: data.postal_code || undefined,
        health_insurance_provider_id: data.health_insurance_id ? Number(data.health_insurance_id) : undefined,
        affiliation_type_id: data.affiliation_type_id ? Number(data.affiliation_type_id) : undefined,
        coverage_type_id: data.coverage_type_id ? Number(data.coverage_type_id) : undefined,
        policy_number: data.policy_number || undefined,
        occupation: data.occupation || undefined,
        position: data.position || undefined,
        company: data.company || undefined,
        education_level_id: data.education_level_id ? Number(data.education_level_id) : undefined,
        notes: data.notes || undefined,
      };

      await api.put(`/api/v1/patients/${patientId}`, payload);

      if (profileImageFile) {
        await patientService.uploadProfileImage(Number(patientId), profileImageFile);
      }

      toast({ title: 'Paciente actualizado', description: 'Los datos del paciente fueron actualizados exitosamente.' });
      navigate(patientsListPath);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error',
        description: apiErr?.response?.data?.message || 'No se pudo actualizar el paciente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressFraction = ((currentStep + 1) / STEPS.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f7f9]">
        <Loader2 className="h-8 w-8 animate-spin text-convision-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f9]">
      <div className="bg-white border-b border-[#e5e5e9] px-6 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#7d7d87] mb-0.5">
            <button onClick={() => navigate(patientsListPath)} className="hover:text-[#121215] transition-colors">
              Pacientes
            </button>
            <span>/</span>
            <span className="text-[#121215]">Editar paciente</span>
          </div>
          <h1 className="text-[18px] font-semibold text-[#121215]">Editar paciente</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="h-9 px-4 text-[13px]">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="h-9 px-4 text-[13px] bg-convision-primary hover:bg-convision-dark text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#e5e5e9] shadow-sm overflow-hidden">
            <div className="flex border-b border-[#e5e5e9]">
              {STEPS.map((step, idx) => (
                <button
                  key={step.key}
                  onClick={() => goToStep(idx)}
                  className={cn(
                    'relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-colors border-r border-[#e5e5e9] last:border-r-0',
                    currentStep === idx
                      ? 'text-convision-primary bg-white'
                      : 'text-[#7d7d87] hover:text-[#121215] bg-[#f7f7f9]'
                  )}
                >
                  {step.label}
                  {currentStep === idx && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-convision-primary rounded-t" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8">
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-5 pb-5 border-b border-[#e5e5e9]">
                    <div
                      className="w-18 h-18 rounded-full bg-convision-light flex items-center justify-center text-[22px] font-semibold text-convision-primary overflow-hidden flex-shrink-0"
                      style={{ width: 72, height: 72 }}
                    >
                      {profilePreview ? (
                        <img src={profilePreview} alt="perfil" className="w-full h-full object-cover" />
                      ) : existingProfileUrl ? (
                        <img src={existingProfileUrl} alt="perfil" className="w-full h-full object-cover" onError={() => setExistingProfileUrl(null)} />
                      ) : (
                        <span>{getInitials(firstName, lastName)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#121215] mb-0.5">Foto de perfil</p>
                      <p className="text-[12px] text-[#7d7d87] mb-2">PNG, JPG o WEBP / Máx. 2 MB</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[12px] h-8 gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Cambiar imagen
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-[13px]">
                        Nombre(s) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="Ej. María Elena"
                        {...register('first_name')}
                        className={cn('h-9 text-[13px]', errors.first_name && 'border-red-500')}
                      />
                      {errors.first_name && <p className="text-[12px] text-red-500">{errors.first_name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-[13px]">
                        Apellido(s) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        placeholder="Ej. Torres Pérez"
                        {...register('last_name')}
                        className={cn('h-9 text-[13px]', errors.last_name && 'border-red-500')}
                      />
                      {errors.last_name && <p className="text-[12px] text-red-500">{errors.last_name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Tipo de documento</Label>
                      <Select
                        onValueChange={(v) => setValue('identification_type', v)}
                        value={watch('identification_type') || ''}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="CC / Cédula de ciudadanía" />
                        </SelectTrigger>
                        <SelectContent>
                          {identificationTypes.length > 0 ? (
                            identificationTypes.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="cedula_ciudadania">CC / Cédula de ciudadanía</SelectItem>
                              <SelectItem value="cedula_extranjeria">CE / Cédula de extranjería</SelectItem>
                              <SelectItem value="pasaporte">Pasaporte</SelectItem>
                              <SelectItem value="tarjeta_identidad">TI / Tarjeta de identidad</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="identification" className="text-[13px]">
                        Número de documento <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="identification"
                        placeholder="Ej. 1.234.567.890"
                        {...register('identification')}
                        className={cn('h-9 text-[13px]', errors.identification && 'border-red-500')}
                      />
                      {errors.identification && (
                        <p className="text-[12px] text-red-500">{errors.identification.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">
                        Fecha de nacimiento <span className="text-red-500">*</span>
                      </Label>
                      <DatePicker
                        value={birthDate}
                        onChange={(date) => {
                          if (date) setValue('birth_date', date.toISOString().split('T')[0]);
                          else setValue('birth_date', '');
                        }}
                        placeholder="DD/MM/AAAA"
                        error={errors.birth_date?.message}
                        useInputTrigger
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-[13px]">
                        Teléfono <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="Ej. 311 234 5678"
                        {...register('phone')}
                        className={cn('h-9 text-[13px]', errors.phone && 'border-red-500')}
                      />
                      {errors.phone && <p className="text-[12px] text-red-500">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[13px]">
                      Correo electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Ej. paciente@clinica.com"
                      {...register('email')}
                      className={cn('h-9 text-[13px]', errors.email && 'border-red-500')}
                    />
                    {errors.email && <p className="text-[12px] text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px]">
                      Género <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={genderValue}
                      onValueChange={(v) => setValue('gender', v as 'male' | 'female' | 'other')}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="text-[13px] font-normal cursor-pointer">Masculino</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="text-[13px] font-normal cursor-pointer">Femenino</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="text-[13px] font-normal cursor-pointer">Otro</Label>
                      </div>
                    </RadioGroup>
                    {errors.gender && <p className="text-[12px] text-red-500">{errors.gender.message}</p>}
                  </div>

                  <div className="pt-4 border-t border-[#e5e5e9]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-[#121215]">Estado del paciente</p>
                        <p className="text-[12px] text-[#7d7d87]">Activo o inactivo en el sistema</p>
                      </div>
                      <Switch
                        checked={statusActive}
                        onCheckedChange={(v) => setValue('status', v)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-4 border-b border-[#e5e5e9]">
                    <MapPin className="h-4 w-4 text-convision-primary" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#121215]">Dirección de residencia</p>
                      <p className="text-[12px] text-[#7d7d87]">Todos los campos son opcionales</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-[13px]">Dirección</Label>
                    <Input
                      id="address"
                      placeholder="Ej. Calle 72 #10-34, Apto 502"
                      {...register('address')}
                      className="h-9 text-[13px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">País</Label>
                      <Select
                        onValueChange={(v) => setValue('country_id', v)}
                        value={watch('country_id') || ''}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Colombia" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Departamento / Estado</Label>
                      <Select
                        onValueChange={(v) => setValue('department_id', v)}
                        value={watch('department_id') || ''}
                        disabled={!countryId}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Ciudad / Municipio</Label>
                      <Select
                        onValueChange={(v) => setValue('city_id', v)}
                        value={watch('city_id') || ''}
                        disabled={!departmentId}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Barrio / Distrito</Label>
                      <Select
                        onValueChange={(v) => setValue('district_id', v)}
                        value={watch('district_id') || ''}
                        disabled={!cityId}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="neighborhood" className="text-[13px]">Barrio (texto libre)</Label>
                      <Input
                        id="neighborhood"
                        placeholder="Ej. El Poblado"
                        {...register('neighborhood')}
                        className="h-9 text-[13px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="postal_code" className="text-[13px]">Código postal</Label>
                      <Input
                        id="postal_code"
                        placeholder="Ej. 050021"
                        {...register('postal_code')}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-convision-light rounded-lg px-4 py-3 text-[12px] text-convision-primary">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Selecciona País para activar Departamento, luego Ciudad y Barrio en cascada.</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#7d7d87]">
                    <Lock className="h-3 w-3" />
                    <span>Bloqueado hasta elegir el nivel anterior</span>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-4 border-b border-[#e5e5e9]">
                    <Shield className="h-4 w-4 text-convision-primary" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#121215]">Información del seguro médico</p>
                      <p className="text-[12px] text-[#7d7d87]">Todos los campos son opcionales</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">EPS / Aseguradora</Label>
                    <Select
                      onValueChange={(v) => setValue('health_insurance_id', v)}
                      value={watch('health_insurance_id') || ''}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccionar aseguradora..." />
                      </SelectTrigger>
                      <SelectContent>
                        {healthInsuranceProviders.map((h) => (
                          <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Tipo de afiliación</Label>
                      <Select
                        onValueChange={(v) => setValue('affiliation_type_id', v)}
                        value={watch('affiliation_type_id') || ''}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {affiliationTypes.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Tipo de cobertura</Label>
                      <Select
                        onValueChange={(v) => setValue('coverage_type_id', v)}
                        value={watch('coverage_type_id') || ''}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {coverageTypes.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="policy_number" className="text-[13px]">Número de póliza / afiliación</Label>
                    <Input
                      id="policy_number"
                      placeholder="Opcional"
                      {...register('policy_number')}
                      className="h-9 text-[13px]"
                    />
                  </div>

                  <div className="flex items-start gap-2 bg-convision-light rounded-lg px-4 py-3 text-[12px] text-convision-primary">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Estos datos se usan para generar órdenes médicas y facturación de citas.</span>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-4 border-b border-[#e5e5e9]">
                    <Briefcase className="h-4 w-4 text-convision-primary" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#121215]">Información laboral y educativa</p>
                      <p className="text-[12px] text-[#7d7d87]">Todos los campos son opcionales</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="occupation" className="text-[13px]">Ocupación</Label>
                      <Input
                        id="occupation"
                        placeholder="Ej. Médico, Ingeniero, Docente..."
                        {...register('occupation')}
                        className="h-9 text-[13px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="position" className="text-[13px]">Cargo</Label>
                      <Input
                        id="position"
                        placeholder="Ej. Gerente, Analista..."
                        {...register('position')}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="company" className="text-[13px]">Empresa</Label>
                    <Input
                      id="company"
                      placeholder="Nombre de la empresa u organización"
                      {...register('company')}
                      className="h-9 text-[13px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Nivel educativo</Label>
                    <Select
                      onValueChange={(v) => setValue('education_level_id', v)}
                      value={watch('education_level_id') || ''}
                    >
                      <SelectTrigger className="h-9 text-[13px]">
                        <SelectValue placeholder="Seleccionar nivel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-4 border-b border-[#e5e5e9]">
                    <FileText className="h-4 w-4 text-convision-primary" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#121215]">Notas clínicas y administrativas</p>
                      <p className="text-[12px] text-[#7d7d87]">Opcional — solo visible para el equipo médico autorizado</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-[13px]">Notas clínicas</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ej. Paciente con antecedentes de hipertensión. Alergias: penicilina. Observaciones para el equipo tratante..."
                      {...register('notes')}
                      className="text-[13px] resize-none h-56"
                      maxLength={2000}
                    />
                    <p className="text-[11px] text-[#7d7d87]">{notes.length} / 2000 caracteres</p>
                    {errors.notes && <p className="text-[12px] text-red-500">{errors.notes.message}</p>}
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-4 py-3 text-[12px] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Las notas son confidenciales y solo visibles para el equipo de salud autorizado.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full xl:w-[280px] xl:flex-shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-[#e5e5e9] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#e5e5e9]">
                <FileText className="h-3.5 w-3.5 text-convision-primary" />
                <p className="text-[13px] font-semibold text-[#121215]">Progreso del formulario</p>
              </div>
              <div className="px-5 py-3 space-y-3">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = completedSteps.has(idx) && currentStep !== idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <button
                      key={step.key}
                      onClick={() => goToStep(idx)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            'h-3 w-3',
                            isCurrent ? 'text-convision-primary' : isCompleted ? 'text-[#0f8f64]' : 'text-[#b4b5bc]'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[13px]',
                            isCurrent ? 'font-medium text-[#121215]' : isCompleted ? 'text-[#0f8f64]' : 'text-[#7d7d87]'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#0f8f64]" />
                      ) : isCurrent ? (
                        <ArrowRight className="h-3 w-3 text-convision-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5e5e9] shadow-sm px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-3.5 w-3.5 text-convision-primary" />
                <p className="text-[13px] font-semibold text-[#121215]">Guarda cuando quieras</p>
              </div>
              <p className="text-[12px] text-[#7d7d87]">
                Puedes guardar los cambios en cualquier momento usando el botón superior.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e5e5e9] px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative h-1 w-48 bg-[#e5e5e9] rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-convision-primary rounded-full transition-all duration-300"
                style={{ width: `${progressFraction}%` }}
              />
            </div>
            <span className="text-[12px] text-[#7d7d87]">Paso {currentStep + 1} de {STEPS.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="h-9 px-4 text-[13px]">
                ← Anterior
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(-1)} className="h-9 px-4 text-[13px]">
              Cancelar
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                className="h-9 px-4 text-[13px] bg-convision-primary hover:bg-convision-dark text-white gap-1.5"
              >
                Siguiente <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="h-9 px-5 text-[13px] bg-convision-primary hover:bg-convision-dark text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPatient;
