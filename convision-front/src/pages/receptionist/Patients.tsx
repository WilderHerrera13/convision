import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, X, Eye, Edit, Phone, Mail, Loader2, User, Camera } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import api from '@/lib/axios';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from "@/components/ui/image-upload";
import { patientService } from "@/services/patientService";
import { Avatar } from "@/components/ui/avatar";
import { DataTableColumnDef, EntityTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import PageLayout from '@/components/layouts/PageLayout';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Patient type
type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  neighborhood?: string;
  postal_code?: string;
  eps?: string;
  affiliation?: string;
  coverage?: string;
  occupation?: string;
  education?: string; 
  position?: string;
  company?: string;
  notes?: string;
  status?: string;
  profile_image?: string | null;
};

// Validation schema for patient form
const patientSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  identification: z.string().min(5, "La identificación debe tener al menos 5 caracteres").transform(v => v.replace(/,/g, '')),
  email: z.string().email("Ingrese un correo electrónico válido"),
  phone: z.string().optional().transform(v => v?.replace(/,/g, '')),
  birth_date: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  neighborhood: z.string().optional(),
  postal_code: z.string().optional(),
  eps: z.string().optional(),
  affiliation: z.string().optional(),
  coverage: z.string().optional(),
  occupation: z.string().optional(),
  education: z.string().optional(),
  position: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  profileImageFile: z.any().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;


const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-[#ebf5ef] text-[#228b52]' },
  inactive: { label: 'Inactivo', className: 'bg-[#f9f9fa] text-[#7d7d87]' },
};

const Patients: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize forms
  const createForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      identification: '',
      email: '',
      phone: '',
      birth_date: '',
      gender: '',
      address: '',
      city: '',
      district: '',
      state: '',
      country: 'Colombia',
      neighborhood: '',
      postal_code: '',
      eps: '',
      affiliation: '',
      coverage: '',
      occupation: '',
      education: '',
      position: '',
      company: '',
      notes: '',
      status: 'active',
    },
  });

  const editForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      identification: '',
      email: '',
      phone: '',
      birth_date: '',
      gender: '',
      address: '',
      city: '',
      district: '',
      state: '',
      country: 'Colombia',
      neighborhood: '',
      postal_code: '',
      eps: '',
      affiliation: '',
      coverage: '',
      occupation: '',
      education: '',
      position: '',
      company: '',
      notes: '',
      status: 'active',
    },
  });

  // Mutation to create patient
  const createPatientMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      const payload = {
        ...values,
        identification_type: 'dni',
      };
      const response = await api.post('/api/v1/patients', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsCreateModalOpen(false);
      createForm.reset();
      toast({
        title: "Paciente creado",
        description: "El paciente se ha creado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al crear el paciente.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Mutation to update patient
  const updatePatientMutation = useMutation({
    mutationFn: async (values: PatientFormValues & { id: number }) => {
      const { id, ...rest } = values;
      const response = await api.put(`/api/v1/patients/${id}`, rest);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsEditModalOpen(false);
      setSelectedPatient(null);
      toast({
        title: "Paciente actualizado",
        description: "El paciente se ha actualizado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al actualizar el paciente.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  const onCreateSubmit = async (values: PatientFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create patient
      const patientResponse = await api.post('/api/v1/patients', values);
      const newPatient = patientResponse.data;
      
      // Handle profile image upload if exists
      if (values.profileImageFile) {
        const formData = new FormData();
        formData.append('profile_image', values.profileImageFile);
        
        await api.post(`/api/v1/patients/${newPatient.id}/profile-image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // Refresh data and show success message
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: "Paciente creado",
        description: "El paciente se ha creado correctamente",
      });
      setIsCreateModalOpen(false);
      createForm.reset();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el paciente. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit = async (values: PatientFormValues) => {
    if (!selectedPatient) return;
    
    try {
      setIsSubmitting(true);
      
      // Update patient
      await api.put(`/api/v1/patients/${selectedPatient.id}`, values);
      
      // Handle profile image upload if exists
      if (values.profileImageFile) {
        const formData = new FormData();
        formData.append('profile_image', values.profileImageFile);
        
        await api.post(`/api/v1/patients/${selectedPatient.id}/profile-image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // Refresh data and show success message
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente se han actualizado correctamente",
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el paciente. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    editForm.reset({
      first_name: patient.first_name,
      last_name: patient.last_name,
      identification: patient.identification,
      email: patient.email,
      phone: patient.phone || '',
      birth_date: patient.birth_date || '',
      gender: (patient.gender || '') as "" | "male" | "female" | "other",
      address: patient.address || '',
      city: patient.city || '',
      district: patient.district || '',
      state: patient.state || '',
      country: patient.country || '',
      neighborhood: patient.neighborhood || '',
      postal_code: patient.postal_code || '',
      eps: patient.eps || '',
      affiliation: patient.affiliation || '',
      coverage: patient.coverage || '',
      occupation: patient.occupation || '',
      education: patient.education || '',
      position: patient.position || '',
      company: patient.company || '',
      notes: patient.notes || '',
      status: (patient.status || 'active') as "active" | "inactive",
    });
    setIsEditModalOpen(true);
  };

  const viewAppointmentHistory = (patientId: number) => {
    // Navigate to appointments filtered by this patient
    navigate(`/receptionist/appointments?patient=${patientId}`);
  };

  const columns: DataTableColumnDef<Patient>[] = [
    {
      id: 'full_name',
      header: 'Paciente',
      type: 'text',
      accessorKey: 'first_name',
      cell: (patient) => (
        <span className="font-semibold text-[13px] text-[#121215]">
          {patient.first_name} {patient.last_name}
        </span>
      ),
    },
    {
      id: 'identification',
      header: 'Documento',
      type: 'text',
      accessorKey: 'identification',
      cell: (patient) => (
        <span className="text-[13px] text-[#7d7d87]">CC {patient.identification}</span>
      ),
    },
    {
      id: 'phone',
      header: 'Teléfono',
      type: 'text',
      accessorKey: 'phone',
      cell: (patient) => (
        <span className="text-[13px] text-[#7d7d87]">{patient.phone || '—'}</span>
      ),
    },
    {
      id: 'last_visit',
      header: 'Última visita',
      type: 'text',
      cell: (patient) => (
        <span className="text-[13px] text-[#7d7d87]">
          {patient.updated_at
            ? format(parseISO(patient.updated_at), "d MMM yyyy", { locale: es })
            : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      type: 'text',
      accessorKey: 'status',
      cell: (patient) => {
        const cfg = STATUS_CONFIG[patient.status ?? 'inactive'] ?? STATUS_CONFIG.inactive;
        return (
          <span className={cn('inline-flex items-center justify-center px-[10px] py-0.5 rounded-full text-[11px] font-semibold', cfg.className)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: (patient) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-convision-light border border-convision-primary/30 text-convision-primary hover:opacity-80 transition-colors"
            onClick={() => viewAppointmentHistory(patient.id)}
            title="Ver historial"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="flex items-center justify-center size-8 rounded-[6px] bg-[#f5f5f7] border border-[#e0e0e4] text-[#7d7d87] hover:bg-[#ebebee] transition-colors"
            onClick={() => navigate(`/receptionist/patients/${patient.id}/edit`)}
            title="Editar paciente"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[#121215]">Pacientes</h1>
          <p className="text-[13px] text-[#7d7d87] mt-0.5">Base de datos de pacientes</p>
        </div>
        <Button
          onClick={() => navigate('/receptionist/patients/new')}
          className="bg-convision-primary hover:bg-convision-dark text-white text-[13px] h-9 px-4 font-semibold"
        >
          + Nuevo paciente
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
          <SelectTrigger className="w-[148px] h-9 text-[13px] bg-white border-[#e5e5e9]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <EntityTable<Patient>
        columns={columns}
        queryKeyBase="patients"
        fetcher={async ({ page, per_page, search }) => {
          const params: Record<string, unknown> = { page, per_page };
          if (search && search.length >= 3) {
            params.s_f = JSON.stringify(['first_name', 'last_name', 'identification', 'email']);
            params.s_v = JSON.stringify([search, search, search, search]);
            params.s_o = 'or';
          }
          if (filterStatus && filterStatus !== 'all') {
            params.f_f = JSON.stringify(['status']);
            params.f_v = JSON.stringify([filterStatus]);
          }
          const response = await api.get('/api/v1/patients', { params });
          return { data: response.data.data, last_page: response.data.meta?.last_page ?? 1, total: response.data.meta?.total };
        }}
        searchPlaceholder="Buscar paciente..."
        extraFilters={{ filterStatus }}
        onRowClick={(patient) => navigate(`/receptionist/patients/${patient.id}/edit`)}
        tableLayout="ledger"
        paginationVariant="figma"
        toolbarLeading={
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#121215]">Pacientes</span>
            <span className="text-[11px] text-[#7d7d87]">Base de datos</span>
          </div>
        }
        emptyStateNode={<EmptyState variant="patients" />}
        filterEmptyStateNode={<EmptyState variant="table-filter" />}
      />

      {/* Create Patient Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Paciente</DialogTitle>
            <DialogDescription>
              Ingrese los datos del nuevo paciente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      {...createForm.register("first_name")}
                    />
                    {createForm.formState.errors.first_name && (
                      <p className="text-sm text-red-500">
                        {createForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      {...createForm.register("last_name")}
                    />
                    {createForm.formState.errors.last_name && (
                      <p className="text-sm text-red-500">
                        {createForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identification">Identificación</Label>
                  <Input
                    id="identification"
                    {...createForm.register("identification")}
                  />
                  {createForm.formState.errors.identification && (
                    <p className="text-sm text-red-500">
                      {createForm.formState.errors.identification.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    {...createForm.register("email")}
                  />
                  {createForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    {...createForm.register("phone")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      {...createForm.register("birth_date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Género</Label>
                    <Select
                      onValueChange={(value) => {
                        createForm.setValue("gender", value as "" | "male" | "female" | "other");
                      }}
                      defaultValue={createForm.getValues("gender")}
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
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    {...createForm.register("address")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      {...createForm.register("country")}
                      defaultValue="Colombia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Departamento</Label>
                    <Input
                      id="state"
                      {...createForm.register("state")}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      {...createForm.register("city")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Distrito</Label>
                    <Input
                      id="district"
                      {...createForm.register("district")}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Barrio</Label>
                    <Input
                      id="neighborhood"
                      {...createForm.register("neighborhood")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      {...createForm.register("postal_code")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eps">EPS</Label>
                  <Input
                    id="eps"
                    {...createForm.register("eps")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="affiliation">Tipo de Afiliación</Label>
                    <Input
                      id="affiliation"
                      {...createForm.register("affiliation")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverage">Cobertura</Label>
                    <Input
                      id="coverage"
                      {...createForm.register("coverage")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="occupation">Ocupación</Label>
                  <Input
                    id="occupation"
                    {...createForm.register("occupation")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education">Nivel de Educación</Label>
                    <Input
                      id="education"
                      {...createForm.register("education")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Input
                      id="position"
                      {...createForm.register("position")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    {...createForm.register("company")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    {...createForm.register("notes")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    onValueChange={(value) => {
                      createForm.setValue("status", value as "active" | "inactive");
                    }}
                    defaultValue={createForm.getValues("status") || "active"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="text-center mb-4">
                  <Label>Fotografía del Paciente</Label>
                </div>
                <ImageUpload
                  onImageCapture={(file) => createForm.setValue("profileImageFile", file)}
                  onImageRemove={() => createForm.setValue("profileImageFile", undefined)}
                  containerClassName="w-[200px] h-[200px]"
                  imageClassName="w-[200px] h-[200px]" 
                  isUploading={isSubmitting}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Paciente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Actualice los datos del paciente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_first_name">Nombre</Label>
                    <Input
                      id="edit_first_name"
                      {...editForm.register("first_name")}
                    />
                    {editForm.formState.errors.first_name && (
                      <p className="text-sm text-red-500">
                        {editForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_last_name">Apellido</Label>
                    <Input
                      id="edit_last_name"
                      {...editForm.register("last_name")}
                    />
                    {editForm.formState.errors.last_name && (
                      <p className="text-sm text-red-500">
                        {editForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_identification">Identificación</Label>
                  <Input
                    id="edit_identification"
                    {...editForm.register("identification")}
                  />
                  {editForm.formState.errors.identification && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.identification.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_email">Correo Electrónico</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    {...editForm.register("email")}
                  />
                  {editForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {editForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Teléfono</Label>
                  <Input
                    id="edit_phone"
                    {...editForm.register("phone")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_birth_date">Fecha de Nacimiento</Label>
                    <Input
                      id="edit_birth_date"
                      type="date"
                      {...editForm.register("birth_date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_gender">Género</Label>
                    <Select
                      onValueChange={(value) => {
                        editForm.setValue("gender", value as "" | "male" | "female" | "other");
                      }}
                      defaultValue={editForm.getValues("gender")}
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
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_address">Dirección</Label>
                  <Input
                    id="edit_address"
                    {...editForm.register("address")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_country">País</Label>
                    <Input
                      id="edit_country"
                      {...editForm.register("country")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_state">Departamento</Label>
                    <Input
                      id="edit_state"
                      {...editForm.register("state")}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_city">Ciudad</Label>
                    <Input
                      id="edit_city"
                      {...editForm.register("city")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_district">Distrito</Label>
                    <Input
                      id="edit_district"
                      {...editForm.register("district")}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_neighborhood">Barrio</Label>
                    <Input
                      id="edit_neighborhood"
                      {...editForm.register("neighborhood")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_postal_code">Código Postal</Label>
                    <Input
                      id="edit_postal_code"
                      {...editForm.register("postal_code")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_eps">EPS</Label>
                  <Input
                    id="edit_eps"
                    {...editForm.register("eps")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_affiliation">Tipo de Afiliación</Label>
                    <Input
                      id="edit_affiliation"
                      {...editForm.register("affiliation")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_coverage">Cobertura</Label>
                    <Input
                      id="edit_coverage"
                      {...editForm.register("coverage")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_occupation">Ocupación</Label>
                  <Input
                    id="edit_occupation"
                    {...editForm.register("occupation")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_education">Nivel de Educación</Label>
                    <Input
                      id="edit_education"
                      {...editForm.register("education")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_position">Cargo</Label>
                    <Input
                      id="edit_position"
                      {...editForm.register("position")}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_company">Empresa</Label>
                  <Input
                    id="edit_company"
                    {...editForm.register("company")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notas</Label>
                  <Input
                    id="edit_notes"
                    {...editForm.register("notes")}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_status">Estado</Label>
                  <Select
                    onValueChange={(value) => {
                      editForm.setValue("status", value as "active" | "inactive");
                    }}
                    defaultValue={editForm.getValues("status") || "active"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="text-center mb-4">
                  <Label>Fotografía del Paciente</Label>
                </div>
                <ImageUpload
                  onImageCapture={(file) => editForm.setValue("profileImageFile", file)}
                  onImageRemove={() => editForm.setValue("profileImageFile", undefined)}
                  imageUrl={selectedPatient?.profile_image ? 
                    patientService.getProfileImageUrl(selectedPatient.profile_image) : undefined}
                  containerClassName="w-[200px] h-[200px]"
                  imageClassName="w-[200px] h-[200px]" 
                  isUploading={isSubmitting}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients; 