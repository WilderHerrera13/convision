import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import SearchableCombobox, { ComboboxOption } from '@/components/ui/SearchableCombobox';
import { toast } from '@/components/ui/use-toast';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { laboratoryOrderService, CreateLaboratoryOrderRequest, RxEye, FrameSpecs } from '@/services/laboratoryOrderService';
import { Laboratory, laboratoryService } from '@/services/laboratoryService';
import { Patient, patientService } from '@/services/patientService';
import { userService, User } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';

const LENS_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'monofocal', label: 'Monofocal' },
  { value: 'bifocal', label: 'Bifocal' },
  { value: 'progresivo', label: 'Progresivo' },
  { value: 'lente_contacto', label: 'Lente de contacto' },
  { value: 'otro', label: 'Otro' },
];

const PRIORITY_OPTIONS: ComboboxOption[] = [
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_OPTIONS: ComboboxOption[] = [
  { value: 'pending', label: 'Pendiente' },
];

const BRANCH_OPTIONS: ComboboxOption[] = [
  { value: 'sede_principal', label: 'Sede Principal' },
];

const FRAME_TYPE_OPTIONS: ComboboxOption[] = [
  { value: 'tres_piezas', label: 'Tres Piezas' },
  { value: 'aro_completo', label: 'Aro Completo' },
  { value: 'semi_aro', label: 'Semi-aro' },
  { value: 'sin_aro', label: 'Sin Aro' },
];

const GENDER_OPTIONS: ComboboxOption[] = [
  { value: 'unisex', label: 'Unisex' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'nino', label: 'Niño' },
];

const rxEyeSchema = z.object({
  sphere: z.string().optional().default(''),
  cylinder: z.string().optional().default(''),
  axis: z.string().optional().default(''),
  addition: z.string().optional().default(''),
  dp: z.string().optional().default(''),
  af: z.string().optional().default(''),
  diameter: z.string().optional().default(''),
  base_curve: z.string().optional().default(''),
  power: z.string().optional().default(''),
  prism_h: z.string().optional().default(''),
  prism_v: z.string().optional().default(''),
});

const frameSpecsSchema = z.object({
  name: z.string().optional().default(''),
  type: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  color: z.string().optional().default(''),
  horizontal: z.string().optional().default(''),
  bridge: z.string().optional().default(''),
  vertical: z.string().optional().default(''),
  pantoscopic_angle: z.string().optional().default(''),
  mechanical_distance: z.string().optional().default(''),
  panoramic_angle: z.string().optional().default(''),
  effective_diameter: z.string().optional().default(''),
});

const formSchema = z.object({
  sale_date: z.date().optional().nullable(),
  sale_order_ref: z.string().optional(),
  seller_id: z.string().optional(),
  branch: z.string().optional(),
  patient_id: z.coerce.number().min(1, 'Seleccione un paciente'),
  patient_identification: z.string().optional(),
  patient_phone: z.string().optional(),
  laboratory_id: z.coerce.number().min(1, 'Seleccione un laboratorio'),
  product_code: z.string().optional(),
  lens_type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_completion_date: z.date().optional().nullable(),
  description: z.string().optional(),
  initial_status: z.string().default('pending'),
  notes: z.string().optional(),
  special_instructions: z.string().optional(),
  rx_od: rxEyeSchema,
  rx_oi: rxEyeSchema,
  lens_od: z.string().optional().default(''),
  lens_oi: z.string().optional().default(''),
  frame_specs: frameSpecsSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface FieldWrapperProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

function FieldWrapper({ label, children, error, className = '' }: FieldWrapperProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[11px] font-medium text-[#121215]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

interface RxRowProps {
  eye: 'OD' | 'OI';
  prefix: 'rx_od' | 'rx_oi';
  control: ReturnType<typeof useForm<FormValues>>['control'];
}

function RxRow({ eye, prefix, control }: RxRowProps) {
  const fields: Array<{ key: keyof RxEye; label: string; w: string }> = [
    { key: 'sphere', label: 'Esfera', w: 'w-[72px]' },
    { key: 'cylinder', label: 'Cilindro', w: 'w-[72px]' },
    { key: 'axis', label: 'Eje', w: 'w-[60px]' },
    { key: 'addition', label: 'Adición', w: 'w-[68px]' },
    { key: 'dp', label: 'DP', w: 'w-[56px]' },
    { key: 'af', label: 'AF', w: 'w-[56px]' },
    { key: 'diameter', label: 'Ø', w: 'w-[56px]' },
    { key: 'base_curve', label: 'Curva B', w: 'w-[68px]' },
    { key: 'power', label: 'Poder', w: 'w-[60px]' },
    { key: 'prism_h', label: 'Prisma H', w: 'w-[68px]' },
    { key: 'prism_v', label: 'Prisma V', w: 'w-[68px]' },
  ];

  return (
    <div className="flex items-start gap-1">
      <div className="w-[32px] h-9 flex items-center justify-center rounded-[4px] bg-[#f0edff] shrink-0">
        <span className="text-[11px] font-bold text-[#8753ef]">{eye}</span>
      </div>
      {fields.map((f) => (
        <Controller
          key={f.key}
          control={control}
          name={`${prefix}.${f.key}` as any}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="—"
              className={`h-9 text-[11px] border-[#e0e0e5] placeholder:text-[#d0d0d5] text-center ${f.w} min-w-0 px-1`}
            />
          )}
        />
      ))}
    </div>
  );
}

interface NewLaboratoryOrderProps {
  redirectTo?: string;
}

const NewLaboratoryOrder: React.FC<NewLaboratoryOrderProps> = ({
  redirectTo = '/admin/laboratory-orders',
}) => {
  const navigate = useNavigate();
  const { user, isReceptionist } = useAuth();
  const isRecepcionista = isReceptionist();
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatientOption, setSelectedPatientOption] = useState<ComboboxOption | null>(null);
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const labOptions: ComboboxOption[] = laboratories.map((l) => ({
    value: String(l.id),
    label: l.name,
  }));

  const patientOptions: ComboboxOption[] = useMemo(() => {
    const results = patientSearchResults.map((p) => ({
      value: String(p.id),
      label: `${p.first_name} ${p.last_name}`,
      sublabel: [p.identification, p.email].filter(Boolean).join(' · '),
    }));
    if (selectedPatientOption && !results.find((o) => o.value === selectedPatientOption.value)) {
      return [selectedPatientOption, ...results];
    }
    return results;
  }, [patientSearchResults, selectedPatientOption]);

  const sellerOptions: ComboboxOption[] = sellers.map((u) => ({
    value: String(u.id),
    label: `${u.name} ${u.last_name}`,
  }));

  const rxDefault = {
    sphere: '', cylinder: '', axis: '', addition: '',
    dp: '', af: '', diameter: '', base_curve: '',
    power: '', prism_h: '', prism_v: '',
  };

  const frameDefault = {
    name: '', type: '', gender: '', color: '',
    horizontal: '', bridge: '', vertical: '',
    pantoscopic_angle: '', mechanical_distance: '',
    panoramic_angle: '', effective_diameter: '',
  };

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sale_date: null,
      sale_order_ref: '',
      seller_id: user ? String(user.id) : '',
      branch: '',
      patient_id: undefined,
      patient_identification: '',
      patient_phone: '',
      laboratory_id: undefined,
      product_code: '',
      lens_type: '',
      priority: 'normal',
      estimated_completion_date: null,
      description: '',
      initial_status: 'pending',
      notes: '',
      special_instructions: '',
      rx_od: rxDefault,
      rx_oi: rxDefault,
      lens_od: '',
      lens_oi: '',
      frame_specs: frameDefault,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [labResult] = await Promise.allSettled([
        laboratoryService.getActiveLaboratories(),
      ]);

      if (labResult.status === 'fulfilled') {
        setLaboratories(labResult.value);
      } else {
        toast({ title: 'Error', description: 'No se pudieron cargar los laboratorios.', variant: 'destructive' });
      }

      try {
        const usersResult = await userService.getUsers({ per_page: 100 });
        setSellers(usersResult.data);
      } catch {
        // Silently ignore — admin-only endpoint
      }
    };
    fetchData();
  }, []);

  const handlePatientSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPatientSearchResults([]);
      return;
    }
    setPatientSearchLoading(true);
    try {
      const result = await patientService.searchPatients({ search: query, perPage: 20 });
      setPatientSearchResults(result.data);
    } catch {
      setPatientSearchResults([]);
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

  const rxToPayload = (rx: typeof rxDefault): RxEye | null => {
    const hasData = Object.values(rx).some((v) => v.trim() !== '');
    if (!hasData) return null;
    return rx as RxEye;
  };

  const frameToPayload = (f: typeof frameDefault): FrameSpecs | null => {
    const hasData = Object.values(f).some((v) => v.trim() !== '');
    if (!hasData) return null;
    return f as FrameSpecs;
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const sellerUser = sellers.find((s) => String(s.id) === values.seller_id);
      const sellerName = sellerUser
        ? `${sellerUser.name} ${sellerUser.last_name}`
        : isRecepcionista && user
          ? `${user.name} ${(user as any).last_name ?? ''}`
          : '';

      const orderData: CreateLaboratoryOrderRequest = {
        laboratory_id: values.laboratory_id,
        patient_id: values.patient_id,
        priority: values.priority,
        estimated_completion_date: values.estimated_completion_date
          ? values.estimated_completion_date.toISOString().split('T')[0]
          : null,
        notes: values.notes,
        status: values.initial_status,
        sale_date: values.sale_date
          ? values.sale_date.toISOString().split('T')[0]
          : null,
        branch: values.branch,
        seller_name: sellerName,
        special_instructions: values.special_instructions,
        rx_od: rxToPayload(values.rx_od),
        rx_oi: rxToPayload(values.rx_oi),
        lens_od: values.lens_od,
        lens_oi: values.lens_oi,
        frame_specs: frameToPayload(values.frame_specs),
      };
      await laboratoryOrderService.createLaboratoryOrder(orderData);
      toast({ title: 'Orden creada', description: 'La orden de laboratorio ha sido creada exitosamente.' });
      navigate(redirectTo);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la orden de laboratorio.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const rxColHeaders = ['Esfera', 'Cilindro', 'Eje', 'Adición', 'DP', 'AF', 'Ø', 'Curva B', 'Poder', 'Prisma H', 'Prisma V'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-[#ebebee] h-[60px] flex items-center justify-between px-6 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#7d7d87]">Órdenes de Laboratorio</span>
            <span className="text-[12px] text-[#d1d1d8]">/</span>
            <span className="text-[12px] font-semibold text-[#0f0f12]">Nueva Orden de Laboratorio</span>
          </div>
          <span className="text-[16px] font-semibold text-[#0f0f12]">Nueva Orden de Laboratorio</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-5 text-[13px] font-semibold border-[#e5e5e9] text-[#121215]"
            onClick={() => navigate(redirectTo)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="lab-order-form"
            disabled={loading}
            className="h-9 px-5 text-[13px] font-semibold bg-[#8753ef] hover:bg-[#7040d6] text-white"
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f6]">
        <form id="lab-order-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 flex gap-6 items-start">
            <div className="flex-1 min-w-0 bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
              <div className="bg-[#fafafb] border-b border-[#e5e5e9] h-[48px] flex">
                <div className="h-full flex items-center px-5 relative bg-white border-r border-[#e5e5e9]">
                  <span className="text-[12px] font-semibold text-[#0f0f12]">Información de la orden</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8753ef]" />
                </div>
              </div>

              <div className="px-8 py-6 space-y-8">
                {/* Gestión comercial */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Gestión comercial</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <FieldWrapper label="Fecha de venta">
                      <Controller
                        control={control}
                        name="sale_date"
                        render={({ field }) => (
                          <DatePicker value={field.value} onChange={field.onChange} placeholder="dd/mm/aaaa" />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Orden de pedido">
                      <Controller
                        control={control}
                        name="sale_order_ref"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. SALE-2026-0099"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Vendedor">
                      {isRecepcionista ? (
                        <Input
                          value={user?.name ?? ''}
                          readOnly
                          disabled
                          className="h-9 text-[12px] border-[#e0e0e5] bg-[#fafafa] cursor-default text-[#121215]"
                        />
                      ) : (
                        <Controller
                          control={control}
                          name="seller_id"
                          render={({ field }) => (
                            <SearchableCombobox
                              options={sellerOptions}
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Seleccione un vendedor"
                              searchPlaceholder="Buscar asesor..."
                            />
                          )}
                        />
                      )}
                    </FieldWrapper>
                    <FieldWrapper label="Sede">
                      <Controller
                        control={control}
                        name="branch"
                        render={({ field }) => (
                          <SearchableCombobox
                            options={BRANCH_OPTIONS}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Seleccione la sede"
                            searchPlaceholder="Buscar sede..."
                          />
                        )}
                      />
                    </FieldWrapper>
                  </div>
                </div>

                {/* Datos del paciente */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Datos del paciente</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="space-y-5">
                    <FieldWrapper label="Paciente *" error={errors.patient_id?.message}>
                      <Controller
                        control={control}
                        name="patient_id"
                        render={({ field }) => (
                          <SearchableCombobox
                            options={patientOptions}
                            value={field.value ? String(field.value) : ''}
                            onChange={(v) => {
                              field.onChange(v ? Number(v) : undefined);
                              const patient = patientSearchResults.find((p) => String(p.id) === v);
                              if (patient) {
                                setValue('patient_identification', patient.identification ?? '');
                                setValue('patient_phone', patient.phone ?? '');
                                setSelectedPatientOption({
                                  value: v,
                                  label: `${patient.first_name} ${patient.last_name}`,
                                });
                              } else if (!v) {
                                setValue('patient_identification', '');
                                setValue('patient_phone', '');
                                setSelectedPatientOption(null);
                              }
                            }}
                            onSearch={handlePatientSearch}
                            isLoading={patientSearchLoading}
                            placeholder="Buscar paciente..."
                            searchPlaceholder="Nombre, cédula o correo..."
                            emptyText="Escriba para buscar pacientes."
                          />
                        )}
                      />
                    </FieldWrapper>
                    <div className="grid grid-cols-2 gap-x-6">
                      <FieldWrapper label="Documento del cliente">
                        <Controller
                          control={control}
                          name="patient_identification"
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              placeholder="Cédula / NIT del paciente"
                              className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] bg-[#fafafa] cursor-default"
                            />
                          )}
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Número celular">
                        <Controller
                          control={control}
                          name="patient_phone"
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              placeholder="+57 310 000 0000"
                              className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] bg-[#fafafa] cursor-default"
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                </div>

                {/* Prescripción Óptica — Fórmula RX y Prisma */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Prescripción Óptica — Fórmula RX y Prisma</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      {/* Column headers */}
                      <div className="flex items-center gap-1 mb-1 ml-[40px]">
                        {rxColHeaders.map((h) => (
                          <div
                            key={h}
                            className="text-[10px] font-semibold text-[#7d7d87] text-center"
                            style={{ width: h === 'Eje' || h === 'DP' || h === 'AF' || h === 'Ø' || h === 'Poder' ? '56px' : '72px' }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <RxRow eye="OD" prefix="rx_od" control={control} />
                        <RxRow eye="OI" prefix="rx_oi" control={control} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lentes Prescritos */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Lentes Prescritos</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-[32px] h-9 flex items-center justify-center rounded-[4px] bg-[#f0edff] shrink-0 mt-[22px]">
                        <span className="text-[11px] font-bold text-[#8753ef]">OD</span>
                      </div>
                      <FieldWrapper label="Lente ojo derecho (OD)" className="flex-1">
                        <Controller
                          control={control}
                          name="lens_od"
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Ej. L762 – POLY VI / AR / VI SUN +0,00 −1,00"
                              className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-[32px] h-9 flex items-center justify-center rounded-[4px] bg-[#f0edff] shrink-0 mt-[22px]">
                        <span className="text-[11px] font-bold text-[#8753ef]">OI</span>
                      </div>
                      <FieldWrapper label="Lente ojo izquierdo (OI)" className="flex-1">
                        <Controller
                          control={control}
                          name="lens_oi"
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Ej. L762 – POLY VI / AR / VI SUN −1,00 −1,00"
                              className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                </div>

                {/* Especificaciones de Montura */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Especificaciones de Montura</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <FieldWrapper label="Nombre / Modelo de montura" className="col-span-2">
                      <Controller
                        control={control}
                        name="frame_specs.name"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. SAVIG OPTICAL AI2112 · CAFÉ"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Tipo de montura">
                      <Controller
                        control={control}
                        name="frame_specs.type"
                        render={({ field }) => (
                          <SearchableCombobox
                            options={FRAME_TYPE_OPTIONS}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Seleccione el tipo"
                            searchPlaceholder="Buscar..."
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Género">
                      <Controller
                        control={control}
                        name="frame_specs.gender"
                        render={({ field }) => (
                          <SearchableCombobox
                            options={GENDER_OPTIONS}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Seleccione el género"
                            searchPlaceholder="Buscar..."
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Color">
                      <Controller
                        control={control}
                        name="frame_specs.color"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. CAFÉ"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Horizontal (mm)">
                      <Controller
                        control={control}
                        name="frame_specs.horizontal"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 55"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Puente (mm)">
                      <Controller
                        control={control}
                        name="frame_specs.bridge"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 16"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Vertical (mm)">
                      <Controller
                        control={control}
                        name="frame_specs.vertical"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 47"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Ángulo Pantoscópico (°)">
                      <Controller
                        control={control}
                        name="frame_specs.pantoscopic_angle"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 8"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Distancia Mecánica (mm)">
                      <Controller
                        control={control}
                        name="frame_specs.mechanical_distance"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 71"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Ángulo Panorámico (°)">
                      <Controller
                        control={control}
                        name="frame_specs.panoramic_angle"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 5"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Ø Efectivo (mm)">
                      <Controller
                        control={control}
                        name="frame_specs.effective_diameter"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ej. 57"
                            className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                          />
                        )}
                      />
                    </FieldWrapper>
                  </div>
                </div>

                {/* Datos de la orden */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Datos de la orden</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="space-y-5">
                    <FieldWrapper label="Laboratorio *" error={errors.laboratory_id?.message}>
                      <Controller
                        control={control}
                        name="laboratory_id"
                        render={({ field }) => (
                          <SearchableCombobox
                            options={labOptions}
                            value={field.value ? String(field.value) : ''}
                            onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                            placeholder="Seleccione un laboratorio"
                            searchPlaceholder="Buscar laboratorio..."
                          />
                        )}
                      />
                    </FieldWrapper>
                    <div className="grid grid-cols-2 gap-x-6">
                      <FieldWrapper label="Código del producto">
                        <Controller
                          control={control}
                          name="product_code"
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Ej. LEN-CR39-MF-125"
                              className="h-9 text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc]"
                            />
                          )}
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Tipo de lente">
                        <Controller
                          control={control}
                          name="lens_type"
                          render={({ field }) => (
                            <SearchableCombobox
                              options={LENS_TYPE_OPTIONS}
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Seleccione el tipo"
                              searchPlaceholder="Buscar tipo..."
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6">
                      <FieldWrapper label="Prioridad *">
                        <Controller
                          control={control}
                          name="priority"
                          render={({ field }) => (
                            <SearchableCombobox
                              options={PRIORITY_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccione prioridad"
                              searchPlaceholder="Buscar..."
                            />
                          )}
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Fecha estimada de entrega">
                        <Controller
                          control={control}
                          name="estimated_completion_date"
                          render={({ field }) => (
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccionar fecha"
                              minDate={new Date()}
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                    <FieldWrapper label="Descripción del pedido">
                      <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Lentes monofocales CR-39, antirreflejo, +1.25 OD / +1.00 OI..."
                            className="text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] resize-none min-h-[68px]"
                            rows={3}
                          />
                        )}
                      />
                    </FieldWrapper>
                  </div>
                </div>

                {/* Detalles adicionales */}
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f12]">Detalles adicionales</p>
                  <div className="h-px bg-[#f0f0f2] mt-2 mb-4" />
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-x-6">
                      <FieldWrapper label="Estado inicial">
                        <Controller
                          control={control}
                          name="initial_status"
                          render={({ field }) => (
                            <SearchableCombobox
                              options={STATUS_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccione estado"
                              searchPlaceholder="Buscar..."
                            />
                          )}
                        />
                      </FieldWrapper>
                    </div>
                    <FieldWrapper label="Notas para el laboratorio">
                      <Controller
                        control={control}
                        name="notes"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Instrucciones especiales, observaciones o alertas para el laboratorio"
                            className="text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] resize-none min-h-[68px]"
                            rows={3}
                          />
                        )}
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Observaciones e instrucciones especiales">
                      <Controller
                        control={control}
                        name="special_instructions"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Sin observaciones adicionales."
                            className="text-[12px] border-[#e0e0e5] placeholder:text-[#b4b5bc] resize-none min-h-[68px]"
                            rows={3}
                          />
                        )}
                      />
                    </FieldWrapper>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[332px] shrink-0 space-y-4">
              <div className="bg-white border border-[#ebebee] rounded-[8px] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e5e9]">
                  <span className="text-[#8753ef] text-[10px]">◆</span>
                  <span className="text-[13px] font-semibold text-[#0f0f12]">Sobre esta orden</span>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {[
                    { label: 'Laboratorio', desc: 'Taller que fabricará el producto óptico solicitado.' },
                    { label: 'Prescripción RX', desc: 'Ingrese los datos ópticos por ojo: OD (derecho) y OI (izquierdo).' },
                    { label: 'Lentes Prescritos', desc: 'Descripción del lente a fabricar para cada ojo.' },
                    { label: 'Especificaciones de Montura', desc: 'Medidas y características físicas de la montura.' },
                    { label: 'Prioridad', desc: 'Urgente o Alta adelantan la orden en la cola del laboratorio.' },
                    { label: 'Fecha estimada', desc: 'Plazo máximo acordado para recibir el producto listo.' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <span className="size-2 rounded-full bg-[#8753ef] shrink-0 mt-1.5" />
                      <div>
                        <p className="text-[12px] font-semibold text-[#0f0f12]">{label}</p>
                        <p className="text-[11px] text-[#7d7d87] mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#f1edff] border border-[#8753ef] rounded-[8px] px-3 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#8753ef] text-[10px]">◆</span>
                  <span className="text-[13px] font-semibold text-[#8753ef]">Flujo de estados</span>
                </div>
                <p className="text-[12px] text-[#8753ef] leading-[1.6]">
                  Al crear la orden, esta queda en estado "Pendiente" hasta que se envíe al laboratorio.
                  Todo cambio se registra en el historial.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white border-t border-[#e5e5e9] h-[64px] flex items-center px-6 shrink-0">
        <p className="text-[12px] text-[#7d7d87]">Campos marcados con * son obligatorios</p>
      </div>
    </div>
  );
};

export default NewLaboratoryOrder;
