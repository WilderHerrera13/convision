import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Search, Plus, X, Trash, Edit, Phone, Mail, Loader2, FileText, Camera, User, UserCircle, MapPin, Stethoscope, Building2, BookCheck } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { ImageUpload } from "@/components/ui/image-upload";
import { patientService } from "@/services/patientService";
import { patientLookupService } from "@/services/patientLookupService";
import type { 
  IdentificationType, 
  Country, 
  Department, 
  City, 
  District, 
  HealthInsuranceProvider, 
  AffiliationType, 
  CoverageType, 
  EducationLevel 
} from "@/services/patientLookupService";
import { Avatar } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DataTable,
  DataTableColumnDef,
} from '@/components/ui/data-table';

// Patient type
type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  identification_type: string;
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
  profile_image?: string;
  country_id?: number;
  department_id?: number;
  city_id?: number;
  district_id?: number;
};

// Validation schema for patient form
const patientSchema = z.object({
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  identification: z.string().min(5, "La identificación debe tener al menos 5 caracteres"),
  identification_type: z.string().default("cedula_ciudadania"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  country_id: z.string().optional(),
  department_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
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

// Defino una interfaz para representar los errores del backend
interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
}

const Patients: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const perPage = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tracking tab visits and navigation
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    personal: false,
    contact: false,
    location: false,
    health: false,
    photo: false
  });
  const [activeTab, setActiveTab] = useState('personal');
  const allTabsVisited = Object.values(visitedTabs).every(visited => visited);
  
  // Orden de las pestañas para navegación secuencial
  const tabOrder = ['personal', 'contact', 'location', 'health', 'photo'];

  // Lookup data states
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [healthInsuranceProviders, setHealthInsuranceProviders] = useState<HealthInsuranceProvider[]>([]);
  const [affiliationTypes, setAffiliationTypes] = useState<AffiliationType[]>([]);
  const [coverageTypes, setCoverageTypes] = useState<CoverageType[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);

  // Selected location IDs for cascading dropdowns
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [editSelectedCountryId, setEditSelectedCountryId] = useState<number | null>(null);
  const [editSelectedDepartmentId, setEditSelectedDepartmentId] = useState<number | null>(null);
  const [editSelectedCityId, setEditSelectedCityId] = useState<number | null>(null);

  // Mapeo de errores del backend a mensajes en español
  const errorMessages = {
    email: {
      "The email has already been taken.": "Este correo electrónico ya está registrado en el sistema.",
      "The email must be a valid email address.": "Debe ingresar un correo electrónico válido."
    },
    identification: {
      "The identification has already been taken.": "Este número de identificación ya está registrado en el sistema."
    }
  };

  // Traducir mensaje de error basado en el campo y mensaje
  const translateErrorMessage = (field: string, message: string) => {
    return errorMessages[field as keyof typeof errorMessages]?.[message] || message;
  };

  // Fetch lookup data
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        // Get all patient-related lookup data in a single request
        const patientLookupData = await patientLookupService.getAllLookupData();
        console.log('EPS data received from backend:', patientLookupData.health_insurance_providers);
        setIdentificationTypes(patientLookupData.identification_types);
        setHealthInsuranceProviders(patientLookupData.health_insurance_providers);
        setAffiliationTypes(patientLookupData.affiliation_types);
        setCoverageTypes(patientLookupData.coverage_types);
        setEducationLevels(patientLookupData.education_levels);

        // Get countries
        const countriesData = await patientLookupService.getCountries();
        setCountries(countriesData);

      } catch (error) {
        console.error('Error fetching lookup data:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar los datos de referencia",
          variant: "destructive",
        });
      }
    };

    fetchLookupData();
  }, [toast]);

  // Fetch departments when country changes
  useEffect(() => {
    if (selectedCountryId) {
      const fetchDepartments = async () => {
        try {
          const data = await patientLookupService.getDepartments(selectedCountryId);
          console.log('Departamentos recibidos:', data.length, data);
          setDepartments(data);
          // Reset dependent fields
          setSelectedDepartmentId(null);
          setCities([]);
          setDistricts([]);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
      };
      fetchDepartments();
    } else {
      setDepartments([]);
    }
  }, [selectedCountryId]);

  // Fetch cities when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      const fetchCities = async () => {
        try {
          const data = await patientLookupService.getCities(selectedDepartmentId);
          console.log('Ciudades recibidas para departamento', selectedDepartmentId, ':', data.length, data);
          setCities(data);
          // Reset dependent fields
          setSelectedCityId(null);
          setDistricts([]);
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [selectedDepartmentId]);

  // Fetch districts when city changes
  useEffect(() => {
    if (selectedCityId) {
      const fetchDistricts = async () => {
        try {
          const data = await patientLookupService.getDistricts(selectedCityId);
          setDistricts(data);
        } catch (error) {
          console.error('Error fetching districts:', error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
    }
  }, [selectedCityId]);

  // Same hooks for editing
  useEffect(() => {
    if (editSelectedCountryId) {
      const fetchDepartments = async () => {
        try {
          const data = await patientLookupService.getDepartments(editSelectedCountryId);
          setDepartments(data);
        } catch (error) {
          console.error('Error fetching departments:', error);
        }
      };
      fetchDepartments();
    }
  }, [editSelectedCountryId]);

  useEffect(() => {
    if (editSelectedDepartmentId) {
      const fetchCities = async () => {
        try {
          const data = await patientLookupService.getCities(editSelectedDepartmentId);
          setCities(data);
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      };
      fetchCities();
    }
  }, [editSelectedDepartmentId]);

  useEffect(() => {
    if (editSelectedCityId) {
      const fetchDistricts = async () => {
        try {
          const data = await patientLookupService.getDistricts(editSelectedCityId);
          setDistricts(data);
        } catch (error) {
          console.error('Error fetching districts:', error);
        }
      };
      fetchDistricts();
    }
  }, [editSelectedCityId]);

  // Initialize forms
  const createForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      identification: '',
      identification_type: 'cedula_ciudadania',
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
      identification_type: 'cedula_ciudadania',
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

  // Query to fetch patients
  const { data, isLoading, isError } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: async () => {
      const params: Record<string, string | number | boolean | string[]> = {
        page,
        per_page: perPage,
      };

      // Add search params if search is provided
      if (search && search.length >= 3) {
        params.s_f = JSON.stringify(['first_name', 'last_name', 'identification', 'email']);
        params.s_v = JSON.stringify([search, search, search, search]);
        params.s_o = 'or'; // Use logical OR for better search
      }

      const response = await api.get('/api/v1/patients', { params });
      return response.data;
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

  // Mutation to delete patient
  const deletePatientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/patients/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsDeleteModalOpen(false);
      setSelectedPatient(null);
      toast({
        title: "Paciente eliminado",
        description: "El paciente se ha eliminado correctamente.",
      });
    },
    onError: (error: Error | { response?: { data?: { message?: string } } }) => {
      const errorMessage = 
        error instanceof Error 
          ? error.message 
          : error.response?.data?.message || "Error al eliminar el paciente.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Función para cambiar de pestaña y marcarla como visitada
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setVisitedTabs(prev => ({
      ...prev,
      [tab]: true
    }));
  };
  
  // Función para validar los campos de la pestaña actual
  const validateCurrentTab = () => {
    let isValid = true;
    
    switch (activeTab) {
      case 'personal':
        // Validar campos obligatorios de información personal
        if (!createForm.getValues('first_name') || !createForm.getValues('last_name') || 
            !createForm.getValues('identification') || !createForm.getValues('identification_type')) {
          toast({
            title: "Información incompleta",
            description: "Por favor complete todos los campos obligatorios en la pestaña de información personal.",
            variant: "destructive",
          });
          isValid = false;
        }
        break;
      case 'contact':
        // Validar campos obligatorios de contacto
        if (!createForm.getValues('email')) {
          toast({
            title: "Información incompleta",
            description: "Por favor ingrese al menos un correo electrónico de contacto.",
            variant: "destructive",
          });
          isValid = false;
        }
        break;
      // Los otros casos (location, health) no tienen validaciones estrictas porque son opcionales
    }
    
    return isValid;
  };
  
  // Función para navegar a la siguiente pestaña
  const goToNextTab = () => {
    if (!validateCurrentTab()) return;
    
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      const nextTab = tabOrder[currentIndex + 1];
      handleTabChange(nextTab);
    }
  };
  
  // Función para navegar a la pestaña anterior
  const goToPrevTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      const prevTab = tabOrder[currentIndex - 1];
      handleTabChange(prevTab);
    }
  };

  // Check if all required tabs are visited and form is complete before submission
  const validateAllTabsVisited = () => {
    if (!allTabsVisited) {
      toast({
        title: "Pestañas incompletas",
        description: "Por favor, revisa todas las pestañas antes de crear el paciente.",
        variant: "destructive",
      });
      return false;
    }
    
    // Validar que todos los campos obligatorios estén completos
    // En lugar de usar un loop con getValues, verificamos cada campo individualmente
    // para evitar problemas de tipo
    if (!createForm.getValues("first_name") || 
        !createForm.getValues("last_name") || 
        !createForm.getValues("identification") || 
        !createForm.getValues("identification_type") ||
        !createForm.getValues("email")) {
      toast({
        title: "Información incompleta",
        description: "Por favor complete todos los campos obligatorios antes de crear el paciente.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const onCreateSubmit = async (values: PatientFormValues) => {
    if (!validateAllTabsVisited()) {
      return;
    }
    
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
    } catch (error: unknown) {
      console.error('Error creating patient:', error);
      
      // Manejar errores de validación del backend
      const apiError = error as ApiError;
      if (apiError.response?.data?.errors) {
        const serverErrors = apiError.response.data.errors;
        
        // Establecer los errores en los campos correspondientes
        Object.entries(serverErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            // Traducir el mensaje de error al español
            const translatedMessage = translateErrorMessage(field, messages[0]);
            
            // Aplicar el error al campo del formulario usando una type assertion para el campo
            createForm.setError(field as keyof PatientFormValues, {
              type: 'server',
              message: translatedMessage
            });
            
            // Si el campo tiene error, navegar a la pestaña correspondiente
            if (field === 'email') {
              handleTabChange('contact');
            } else if (['first_name', 'last_name', 'identification', 'identification_type'].includes(field)) {
              handleTabChange('personal');
            }
          }
        });
      } else {
        // Error general
        toast({
          title: "Error",
          description: "No se pudo crear el paciente. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
      }
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

  // Function to open edit modal
  const openEditModal = (patient: Patient) => {
    setSelectedPatient(patient);
    
    // Reset tabs status and start with personal tab
    setVisitedTabs({
      personal: true,
      contact: true,
      location: true,
      health: true,
      photo: true
    });
    setActiveTab('personal');
    
    // Set selected location IDs for cascading dropdowns if they exist
    if (patient.country_id) {
      setEditSelectedCountryId(patient.country_id);
      // Fetch departments for this country
      patientLookupService.getDepartments(patient.country_id)
        .then(data => {
          setDepartments(data);
          
          if (patient.department_id) {
            setEditSelectedDepartmentId(patient.department_id);
            // Fetch cities for this department
            return patientLookupService.getCities(patient.department_id);
          }
        })
        .then(data => {
          if (data) setCities(data);
          
          if (patient.city_id) {
            setEditSelectedCityId(patient.city_id);
            // Fetch districts for this city
            return patientLookupService.getDistricts(patient.city_id);
          }
        })
        .then(data => {
          if (data) setDistricts(data);
        })
        .catch(error => {
          console.error('Error loading location data:', error);
        });
    }
    
    // Reset the form with patient data
    editForm.reset({
      first_name: patient.first_name,
      last_name: patient.last_name,
      identification: patient.identification,
      identification_type: patient.identification_type || '',
      email: patient.email,
      phone: patient.phone || '',
      birth_date: patient.birth_date || '',
      gender: (patient.gender || '') as "" | "male" | "female" | "other",
      address: patient.address || '',
      country_id: patient.country_id?.toString() || '',
      department_id: patient.department_id?.toString() || '',
      city_id: patient.city_id?.toString() || '',
      district_id: patient.district_id?.toString() || '',
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

  const openDeleteModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  // Reset visited tabs when modal is closed
  useEffect(() => {
    if (!isCreateModalOpen) {
      setVisitedTabs({
        personal: false,
        contact: false,
        location: false,
        health: false,
        photo: false
      });
      setActiveTab('personal');
    }
  }, [isCreateModalOpen]);

  // Define columns for the DataTable
  const columns: DataTableColumnDef[] = [
    {
      id: 'profile_image',
      header: '',
      type: 'text',
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="w-10">
            {patient.profile_image ? (
              <Avatar 
                className="h-9 w-9 rounded-full border-2 border-primary"
                style={{
                  backgroundImage: `url(${patientService.getProfileImageUrl(patient.profile_image)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            ) : (
              <Avatar className="h-9 w-9">
                <User className="h-5 w-5" />
              </Avatar>
            )}
          </div>
        );
      }
    },
    {
      id: 'full_name',
      header: 'Nombre Completo',
      type: 'text',
      accessorKey: 'first_name',
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <span className="font-medium">
            {patient.first_name} {patient.last_name}
          </span>
        );
      }
    },
    {
      id: 'identification',
      header: 'Identificación',
      type: 'text',
      accessorKey: 'identification',
      cell: ({ row }) => {
        const patient = row.original;
        return patient.identification;
      }
    },
    {
      id: 'contact',
      header: 'Contacto',
      type: 'text',
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="flex flex-col">
            <div className="flex items-center text-sm">
              <Mail className="mr-1 h-3 w-3" /> {patient.email}
            </div>
            <div className="flex items-center text-sm">
              <Phone className="mr-1 h-3 w-3" /> {patient.phone || '-'}
            </div>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      type: 'actions',
      cell: ({ row }) => {
        const patient = row.original;
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              asChild
              title="Ver historial"
            >
              <Link to={`/admin/patients/${patient.id}/history`}>
                <FileText className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(patient)}
              title="Editar paciente"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500"
              onClick={() => openDeleteModal(patient)}
              title="Eliminar paciente"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            Administra los pacientes del sistema
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar pacientes..."
              value={search}
              onChange={handleSearch}
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={data?.data || []} 
            loading={isLoading}
            emptyMessage="No se encontraron pacientes"
          />

          {/* Pagination */}
          {data?.meta && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {data.meta.from || 0} a {data.meta.to || 0} de {data.meta.total} pacientes
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.meta.last_page}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Patient Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Paciente</DialogTitle>
            <DialogDescription>
              Ingrese los datos del nuevo paciente en cada una de las secciones. Use los botones de navegación para avanzar en el formulario.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="personal" className="flex items-center gap-1">
                  <UserCircle className="h-4 w-4" /> Personal
                  {visitedTabs.personal && <span className="ml-1 text-xs text-green-500">✓</span>}
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" /> Contacto
                  {visitedTabs.contact && <span className="ml-1 text-xs text-green-500">✓</span>}
                </TabsTrigger>
                <TabsTrigger value="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Dirección
                  {visitedTabs.location && <span className="ml-1 text-xs text-green-500">✓</span>}
                </TabsTrigger>
                <TabsTrigger value="health" className="flex items-center gap-1">
                  <Stethoscope className="h-4 w-4" /> Salud
                  {visitedTabs.health && <span className="ml-1 text-xs text-green-500">✓</span>}
                </TabsTrigger>
                <TabsTrigger value="photo" className="flex items-center gap-1">
                  <Camera className="h-4 w-4" /> Foto
                  {visitedTabs.photo && <span className="ml-1 text-xs text-green-500">✓</span>}
                </TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                      Datos básicos de identificación del paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Nombre</Label>
                        <Input
                          id="first_name"
                          {...createForm.register("first_name")}
                          placeholder="Ingrese nombre"
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
                          placeholder="Ingrese apellido"
                        />
                        {createForm.formState.errors.last_name && (
                          <p className="text-sm text-red-500">
                            {createForm.formState.errors.last_name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="identification_type">Tipo de Identificación</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("identification_type", value);
                          }}
                          defaultValue={createForm.getValues("identification_type")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {identificationTypes.map(type => (
                              <SelectItem key={type.id} value={type.code || ''}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="identification">Número de Identificación</Label>
                        <Input
                          id="identification"
                          {...createForm.register("identification")}
                          placeholder="Ingrese número"
                        />
                        {createForm.formState.errors.identification && (
                          <p className="text-sm text-red-500">
                            {createForm.formState.errors.identification.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                        <DatePicker
                          value={createForm.watch("birth_date") || ''}
                          onChange={(date) => {
                            if (date) {
                              const formattedDate = date.toISOString().split('T')[0];
                              createForm.setValue("birth_date", formattedDate);
                            } else {
                              createForm.setValue("birth_date", '');
                            }
                          }}
                          placeholder="Seleccionar fecha"
                          useInputTrigger={true}
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
                            <SelectValue placeholder="Seleccione género" />
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
                      <Label htmlFor="status">Estado del paciente</Label>
                      <Select
                        onValueChange={(value) => {
                          createForm.setValue("status", value as "active" | "inactive");
                        }}
                        defaultValue={createForm.getValues("status") || "active"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contact Information Tab */}
              <TabsContent value="contact">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                    <CardDescription>
                      Datos de contacto y comunicación
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        {...createForm.register("email")}
                        placeholder="correo@ejemplo.com"
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
                        placeholder="Número telefónico"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occupation">Ocupación</Label>
                      <Input
                        id="occupation"
                        {...createForm.register("occupation")}
                        placeholder="Ocupación o profesión"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="position">Cargo</Label>
                        <Input
                          id="position"
                          {...createForm.register("position")}
                          placeholder="Cargo que ocupa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Empresa</Label>
                        <Input
                          id="company"
                          {...createForm.register("company")}
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="education">Nivel de Educación</Label>
                      <Select
                        onValueChange={(value) => {
                          createForm.setValue("education", value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione nivel educativo" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationLevels.map(level => (
                            <SelectItem key={level.id} value={level.name}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Address Information Tab */}
              <TabsContent value="location">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Dirección</CardTitle>
                    <CardDescription>
                      Datos de ubicación y residencia
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        {...createForm.register("address")}
                        placeholder="Dirección completa"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("country", value);
                            setSelectedCountryId(Number(value));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un país" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem key={country.id} value={country.id.toString()}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Departamento</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("state", value);
                            setSelectedDepartmentId(Number(value));
                          }}
                          disabled={!selectedCountryId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCountryId ? "Seleccione departamento" : "Seleccione país primero"} />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(department => (
                              <SelectItem key={department.id} value={department.id.toString()}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("city", value);
                            setSelectedCityId(Number(value));
                          }}
                          disabled={!selectedDepartmentId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedDepartmentId ? "Seleccione ciudad" : "Seleccione departamento primero"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map(city => (
                              <SelectItem key={city.id} value={city.id.toString()}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">Distrito</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("district", value);
                          }}
                          disabled={!selectedCityId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedCityId ? "Seleccione distrito" : "Seleccione ciudad primero"} />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map(district => (
                              <SelectItem key={district.id} value={district.id.toString()}>
                                {district.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Barrio</Label>
                        <Input
                          id="neighborhood"
                          {...createForm.register("neighborhood")}
                          placeholder="Barrio o localidad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Código Postal</Label>
                        <Input
                          id="postal_code"
                          {...createForm.register("postal_code")}
                          placeholder="Código postal"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Health Information Tab */}
              <TabsContent value="health">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Salud</CardTitle>
                    <CardDescription>
                      Datos de seguridad social y cobertura médica
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="eps">EPS / Proveedor de Salud</Label>
                      <Select
                        onValueChange={(value) => {
                          console.log('Selected EPS value:', value);
                          createForm.setValue("eps", value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione EPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {healthInsuranceProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.id.toString()}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="affiliation">Tipo de Afiliación</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("affiliation", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {affiliationTypes.map(type => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coverage">Cobertura</Label>
                        <Select
                          onValueChange={(value) => {
                            createForm.setValue("coverage", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione cobertura" />
                          </SelectTrigger>
                          <SelectContent>
                            {coverageTypes.map(type => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas Médicas</Label>
                      <Input
                        id="notes"
                        {...createForm.register("notes")}
                        placeholder="Cualquier información relevante sobre el paciente"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photo Tab */}
              <TabsContent value="photo">
                <Card>
                  <CardHeader>
                    <CardTitle>Fotografía del Paciente</CardTitle>
                    <CardDescription>
                      Sube una foto o toma una con la cámara
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center">
                      <ImageUpload
                        onImageCapture={(file) => createForm.setValue("profileImageFile", file)}
                        onImageRemove={() => createForm.setValue("profileImageFile", undefined)}
                        containerClassName="w-[300px] h-[300px]"
                        imageClassName="w-[300px] h-[300px]" 
                        isUploading={isSubmitting}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 flex justify-between">
              {/* Botones de navegación */}
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goToPrevTab}
                  disabled={activeTab === tabOrder[0]} // Deshabilitado en la primera pestaña
                >
                  Anterior
                </Button>
              </div>
              
              <div className="flex gap-2">
                {activeTab !== 'photo' ? (
                  /* Mostrar solo "Siguiente" si no estamos en la última pestaña */
                  <Button
                    type="button"
                    onClick={goToNextTab}
                  >
                    Siguiente
                  </Button>
                ) : (
                  /* En la última pestaña, mostrar el botón para crear el paciente */
                  <>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !allTabsVisited}
                      title={!allTabsVisited ? "Debes visitar todas las pestañas antes de crear el paciente" : ""}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Crear Paciente
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Actualice los datos del paciente.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <Tabs defaultValue="personal" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contacto</TabsTrigger>
                <TabsTrigger value="location">Ubicación</TabsTrigger>
                <TabsTrigger value="health">Salud</TabsTrigger>
                <TabsTrigger value="photo">Foto</TabsTrigger>
              </TabsList>
              
              {/* Personal Information Tab */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                      Datos básicos de identificación del paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_first_name">Nombre</Label>
                        <Input
                          id="edit_first_name"
                          {...editForm.register("first_name")}
                          placeholder="Nombre del paciente"
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
                          placeholder="Apellido del paciente"
                        />
                        {editForm.formState.errors.last_name && (
                          <p className="text-sm text-red-500">
                            {editForm.formState.errors.last_name.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_identification_type">Tipo de Identificación</Label>
                        <Select
                          onValueChange={(value) => {
                            editForm.setValue("identification_type", value);
                          }}
                          defaultValue={editForm.getValues("identification_type")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            {identificationTypes.map(type => (
                              <SelectItem key={type.id} value={type.code || ''}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_identification">Número de Identificación</Label>
                        <Input
                          id="edit_identification"
                          {...editForm.register("identification")}
                          placeholder="Número de documento"
                        />
                        {editForm.formState.errors.identification && (
                          <p className="text-sm text-red-500">
                            {editForm.formState.errors.identification.message}
                          </p>
                        )}
                      </div>
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
                      <Label htmlFor="edit_status">Estado</Label>
                      <Select
                        onValueChange={(value) => {
                          editForm.setValue("status", value as "active" | "inactive");
                        }}
                        defaultValue={editForm.getValues("status")}
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
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Contact Information Tab */}
              <TabsContent value="contact">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                    <CardDescription>
                      Datos de contacto y comunicación
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_email">Correo Electrónico</Label>
                      <Input
                        id="edit_email"
                        type="email"
                        {...editForm.register("email")}
                        placeholder="correo@ejemplo.com"
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
                        placeholder="Número de teléfono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_address">Dirección</Label>
                      <Input
                        id="edit_address"
                        {...editForm.register("address")}
                        placeholder="Dirección de residencia"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Location Tab */}
              <TabsContent value="location">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Ubicación</CardTitle>
                    <CardDescription>
                      Datos geográficos y de residencia
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_country">País</Label>
                        <Select
                          onValueChange={(value) => {
                            const countryId = parseInt(value);
                            setEditSelectedCountryId(countryId);
                            editForm.setValue("country_id", value);
                            // También limpiar los campos dependientes
                            editForm.setValue("department_id", "");
                            editForm.setValue("city_id", "");
                            editForm.setValue("district_id", "");
                            // Cargar departamentos para este país
                            patientLookupService.getDepartments(countryId)
                              .then(data => {
                                setDepartments(data);
                                setEditSelectedDepartmentId(null);
                                setCities([]);
                                setDistricts([]);
                              })
                              .catch(error => {
                                console.error('Error loading departments:', error);
                              });
                          }}
                          defaultValue={editForm.getValues("country_id")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione país" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem key={country.id} value={country.id.toString()}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_department">Departamento</Label>
                        <Select
                          onValueChange={(value) => {
                            const departmentId = parseInt(value);
                            setEditSelectedDepartmentId(departmentId);
                            editForm.setValue("department_id", value);
                            // También limpiar los campos dependientes
                            editForm.setValue("city_id", "");
                            editForm.setValue("district_id", "");
                            // Cargar ciudades para este departamento
                            patientLookupService.getCities(departmentId)
                              .then(data => {
                                setCities(data);
                                setEditSelectedCityId(null);
                                setDistricts([]);
                              })
                              .catch(error => {
                                console.error('Error loading cities:', error);
                              });
                          }}
                          defaultValue={editForm.getValues("department_id")}
                          disabled={!editSelectedCountryId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(department => (
                              <SelectItem key={department.id} value={department.id.toString()}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_city">Ciudad</Label>
                        <Select
                          onValueChange={(value) => {
                            const cityId = parseInt(value);
                            setEditSelectedCityId(cityId);
                            editForm.setValue("city_id", value);
                            // También limpiar los campos dependientes
                            editForm.setValue("district_id", "");
                            // Cargar distritos para esta ciudad
                            patientLookupService.getDistricts(cityId)
                              .then(data => {
                                setDistricts(data);
                              })
                              .catch(error => {
                                console.error('Error loading districts:', error);
                              });
                          }}
                          defaultValue={editForm.getValues("city_id")}
                          disabled={!editSelectedDepartmentId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione ciudad" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map(city => (
                              <SelectItem key={city.id} value={city.id.toString()}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_district">Distrito</Label>
                        <Select
                          onValueChange={(value) => {
                            editForm.setValue("district_id", value);
                          }}
                          defaultValue={editForm.getValues("district_id")}
                          disabled={!editSelectedCityId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione distrito" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map(district => (
                              <SelectItem key={district.id} value={district.id.toString()}>
                                {district.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_neighborhood">Barrio</Label>
                        <Input
                          id="edit_neighborhood"
                          {...editForm.register("neighborhood")}
                          placeholder="Barrio o localidad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_postal_code">Código Postal</Label>
                        <Input
                          id="edit_postal_code"
                          {...editForm.register("postal_code")}
                          placeholder="Código postal"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Health Information Tab */}
              <TabsContent value="health">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Salud</CardTitle>
                    <CardDescription>
                      Datos de seguridad social y cobertura médica
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_eps">EPS / Proveedor de Salud</Label>
                      <Select
                        onValueChange={(value) => {
                          editForm.setValue("eps", value);
                        }}
                        defaultValue={editForm.getValues("eps")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione EPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {healthInsuranceProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.id.toString()}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_affiliation">Tipo de Afiliación</Label>
                        <Select
                          onValueChange={(value) => {
                            editForm.setValue("affiliation", value);
                          }}
                          defaultValue={editForm.getValues("affiliation")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {affiliationTypes.map(type => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_coverage">Cobertura</Label>
                        <Select
                          onValueChange={(value) => {
                            editForm.setValue("coverage", value);
                          }}
                          defaultValue={editForm.getValues("coverage")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione cobertura" />
                          </SelectTrigger>
                          <SelectContent>
                            {coverageTypes.map(type => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit_notes">Notas Médicas</Label>
                      <Input
                        id="edit_notes"
                        {...editForm.register("notes")}
                        placeholder="Cualquier información relevante sobre el paciente"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Photo Tab */}
              <TabsContent value="photo">
                <Card>
                  <CardHeader>
                    <CardTitle>Fotografía del Paciente</CardTitle>
                    <CardDescription>
                      Actualice la foto del paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center">
                      {selectedPatient?.profile_image && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-2">Imagen actual:</p>
                          <img 
                            src={`${import.meta.env.VITE_API_URL}/storage/${selectedPatient.profile_image}`} 
                            alt="Foto actual del paciente"
                            className="w-[150px] h-[150px] object-cover rounded-md"
                          />
                        </div>
                      )}
                      <ImageUpload
                        onImageCapture={(file) => editForm.setValue("profileImageFile", file)}
                        onImageRemove={() => editForm.setValue("profileImageFile", undefined)}
                        containerClassName="w-[300px] h-[300px]"
                        imageClassName="w-[300px] h-[300px]" 
                        isUploading={isSubmitting}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 flex justify-between">
              {/* Botones de navegación */}
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goToPrevTab}
                  disabled={activeTab === tabOrder[0]} // Deshabilitado en la primera pestaña
                >
                  Anterior
                </Button>
              </div>
              
              <div className="flex gap-2">
                {activeTab !== 'photo' ? (
                  /* Mostrar solo "Siguiente" si no estamos en la última pestaña */
                  <Button
                    type="button"
                    onClick={goToNextTab}
                  >
                    Siguiente
                  </Button>
                ) : (
                  /* En la última pestaña, mostrar el botón para actualizar el paciente */
                  <>
                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Actualizar Paciente
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Paciente</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar a {selectedPatient?.first_name} {selectedPatient?.last_name}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPatient && deletePatientMutation.mutate(selectedPatient.id)}
              disabled={deletePatientMutation.isPending}
            >
              {deletePatientMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients; 