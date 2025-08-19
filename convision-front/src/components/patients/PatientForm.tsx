import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ImageUpload } from "@/components/ui/image-upload";
import { patientService } from "@/services/patientService";

// Definición del esquema de validación para el formulario de paciente
const patientSchema = z.object({
  // Datos personales básicos (requeridos)
  first_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  phone: z.string().min(7, "El teléfono debe tener al menos 7 caracteres"),
  identification: z.string().min(5, "La identificación debe tener al menos 5 caracteres"),
  identification_type_id: z.string(),
  birth_date: z.string().min(1, "La fecha de nacimiento es requerida"),
  gender: z.string().min(1, "El género es requerido"),
  
  // Datos de ubicación (opcionales)
  address: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  department_id: z.string().optional(),
  country_id: z.string().optional(),
  neighborhood: z.string().optional(),
  postal_code: z.string().optional(),
  
  // Datos médicos (opcionales)
  health_insurance_id: z.string().optional(),
  affiliation_type_id: z.string().optional(),
  coverage_type_id: z.string().optional(),
  
  // Datos ocupacionales (opcionales)
  occupation: z.string().optional(),
  education_level_id: z.string().optional(),
  position: z.string().optional(),
  company: z.string().optional(),
  
  // Notas y estado
  notes: z.string().optional(),
  status: z.string().default("active"),
  
  // Profile image
  profile_image: z.any().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema> & {
  profileImageFile?: File;
};

interface PatientFormProps {
  initialData?: PatientFormValues;
  onSubmit: (data: PatientFormValues) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

interface Option {
  id: string;
  name: string;
}

const PatientForm: React.FC<PatientFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  mode
}) => {
  // Referencia lookup data
  const [identificationTypes, setIdentificationTypes] = useState<Option[]>([]);
  const [countries, setCountries] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [healthInsuranceProviders, setHealthInsuranceProviders] = useState<Option[]>([]);
  const [affiliationTypes, setAffiliationTypes] = useState<Option[]>([]);
  const [coverageTypes, setCoverageTypes] = useState<Option[]>([]);
  const [educationLevels, setEducationLevels] = useState<Option[]>([]);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  // Inicializar el formulario con valores predeterminados
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: initialData || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      identification: '',
      identification_type_id: '',
      birth_date: '',
      gender: '',
      address: '',
      city_id: '',
      district_id: '',
      department_id: '',
      country_id: '',
      neighborhood: '',
      postal_code: '',
      health_insurance_id: '',
      affiliation_type_id: '',
      coverage_type_id: '',
      occupation: '',
      education_level_id: '',
      position: '',
      company: '',
      notes: '',
      status: 'active',
      profile_image: null,
    }
  });

  // Valores que se observan para actualizar datos dependientes
  const countryId = watch('country_id');
  const departmentId = watch('department_id');
  const cityId = watch('city_id');
  const birthDate = watch('birth_date');

  // Cargar datos de búsqueda (lookup data) al montar el componente
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        // Cargar tipos de identificación
        const idTypesResponse = await api.get('/api/v1/lookup/identification-types');
        setIdentificationTypes(idTypesResponse.data);
        
        // Cargar países
        const countriesResponse = await api.get('/api/v1/lookup/countries');
        setCountries(countriesResponse.data);
        
        // Cargar proveedores de salud
        const healthProvidersResponse = await api.get('/api/v1/lookup/health-insurance-providers');
        setHealthInsuranceProviders(healthProvidersResponse.data);
        
        // Cargar tipos de afiliación
        const affiliationTypesResponse = await api.get('/api/v1/lookup/affiliation-types');
        setAffiliationTypes(affiliationTypesResponse.data);
        
        // Cargar tipos de cobertura
        const coverageTypesResponse = await api.get('/api/v1/lookup/coverage-types');
        setCoverageTypes(coverageTypesResponse.data);
        
        // Cargar niveles de educación
        const educationLevelsResponse = await api.get('/api/v1/lookup/education-levels');
        setEducationLevels(educationLevelsResponse.data);
        
      } catch (error) {
        console.error('Error al cargar datos de referencia:', error);
      }
    };
    
    fetchLookupData();
  }, []);
  
  // Cargar departamentos cuando cambia el país
  useEffect(() => {
    if (countryId) {
      const fetchDepartments = async () => {
        try {
          const response = await api.get(`/api/v1/lookup/departments?country_id=${countryId}`);
          setDepartments(response.data);
        } catch (error) {
          console.error('Error al cargar departamentos:', error);
        }
      };
      fetchDepartments();
    } else {
      setDepartments([]);
    }
  }, [countryId]);
  
  // Cargar ciudades cuando cambia el departamento
  useEffect(() => {
    if (departmentId) {
      const fetchCities = async () => {
        try {
          const response = await api.get(`/api/v1/lookup/cities?department_id=${departmentId}`);
          setCities(response.data);
        } catch (error) {
          console.error('Error al cargar ciudades:', error);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [departmentId]);
  
  // Cargar distritos cuando cambia la ciudad
  useEffect(() => {
    if (cityId) {
      const fetchDistricts = async () => {
        try {
          const response = await api.get(`/api/v1/lookup/districts?city_id=${cityId}`);
          setDistricts(response.data);
        } catch (error) {
          console.error('Error al cargar distritos:', error);
        }
      };
      fetchDistricts();
    } else {
      setDistricts([]);
    }
  }, [cityId]);

  // Manejador para el cambio de fecha de nacimiento
  const handleBirthDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setValue('birth_date', formattedDate);
    } else {
      setValue('birth_date', '');
    }
  };

  const handleImageCapture = (file: File) => {
    setProfileImageFile(file);
  };

  const handleImageRemove = () => {
    setProfileImageFile(null);
    setProfileImageUrl(null);
  };

  // Fetch profile image if in edit mode and profile_image exists
  useEffect(() => {
    if (mode === 'edit' && initialData?.profile_image) {
      const imageUrl = patientService.getProfileImageUrl(initialData.profile_image as string);
      setProfileImageUrl(imageUrl);
    }
  }, [mode, initialData]);

  const handleFormSubmit = (data: PatientFormValues) => {
    const finalData = { ...data };
    
    // Add the profile image file if it exists
    if (profileImageFile) {
      finalData.profileImageFile = profileImageFile;
    }
    
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Tabs defaultValue="personal">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Datos Personales</TabsTrigger>
          <TabsTrigger value="location">Ubicación</TabsTrigger>
          <TabsTrigger value="medical">Datos Médicos</TabsTrigger>
          <TabsTrigger value="occupation">Ocupación</TabsTrigger>
          <TabsTrigger value="image">Fotografía</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Datos Personales */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    {...register("first_name")}
                    className={errors.first_name ? "border-red-500" : ""}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-500">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido <span className="text-red-500">*</span></Label>
                  <Input
                    id="last_name"
                    {...register("last_name")}
                    className={errors.last_name ? "border-red-500" : ""}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-500">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="identification_type_id">Tipo de Identificación <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(value) => setValue("identification_type_id", value)}
                    defaultValue={initialData?.identification_type_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {identificationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.identification_type_id && (
                    <p className="text-sm text-red-500">
                      {errors.identification_type_id.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="identification">Número de Identificación <span className="text-red-500">*</span></Label>
                  <Input
                    id="identification"
                    {...register("identification")}
                    className={errors.identification ? "border-red-500" : ""}
                  />
                  {errors.identification && (
                    <p className="text-sm text-red-500">
                      {errors.identification.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento <span className="text-red-500">*</span></Label>
                  <DatePicker
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    placeholder="Seleccionar fecha de nacimiento"
                    error={errors.birth_date?.message}
                    useInputTrigger={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género <span className="text-red-500">*</span></Label>
                  <Select
                    onValueChange={(value) => setValue("gender", value)}
                    defaultValue={initialData?.gender}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Ubicación */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Información de Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  {...register("address")}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country_id">País</Label>
                  <Select
                    onValueChange={(value) => setValue("country_id", value)}
                    defaultValue={initialData?.country_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Departamento</Label>
                  <Select
                    onValueChange={(value) => setValue("department_id", value)}
                    defaultValue={initialData?.department_id}
                    disabled={!countryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city_id">Ciudad</Label>
                  <Select
                    onValueChange={(value) => setValue("city_id", value)}
                    defaultValue={initialData?.city_id}
                    disabled={!departmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district_id">Distrito/Barrio</Label>
                  <Select
                    onValueChange={(value) => setValue("district_id", value)}
                    defaultValue={initialData?.district_id}
                    disabled={!cityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Sector/Vecindario</Label>
                  <Input
                    id="neighborhood"
                    {...register("neighborhood")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    {...register("postal_code")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Datos Médicos */}
        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="health_insurance_id">EPS / Entidad de Salud</Label>
                <Select
                  onValueChange={(value) => setValue("health_insurance_id", value)}
                  defaultValue={initialData?.health_insurance_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar EPS" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthInsuranceProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="affiliation_type_id">Tipo de Afiliación</Label>
                  <Select
                    onValueChange={(value) => setValue("affiliation_type_id", value)}
                    defaultValue={initialData?.affiliation_type_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {affiliationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage_type_id">Tipo de Cobertura</Label>
                  <Select
                    onValueChange={(value) => setValue("coverage_type_id", value)}
                    defaultValue={initialData?.coverage_type_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cobertura" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Ocupación */}
        <TabsContent value="occupation">
          <Card>
            <CardHeader>
              <CardTitle>Información Ocupacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">Ocupación</Label>
                <Input
                  id="occupation"
                  {...register("occupation")}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education_level_id">Nivel Educativo</Label>
                  <Select
                    onValueChange={(value) => setValue("education_level_id", value)}
                    defaultValue={initialData?.education_level_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    {...register("company")}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  {...register("position")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  className="h-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Fotografía del Paciente */}
        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Fotografía del Paciente</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ImageUpload 
                onImageCapture={handleImageCapture}
                onImageRemove={handleImageRemove}
                imageUrl={profileImageUrl}
                isUploading={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crear Paciente' : 'Actualizar Paciente'}
        </Button>
      </div>
    </form>
  );
};

export default PatientForm; 