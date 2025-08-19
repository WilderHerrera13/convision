import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/axios';
import { clinicalHistorySchema, ClinicalHistoryFormValues } from '../schema';
import { ClinicalHistoryFormProps, ApiError, SectionDefinition } from '../types';

export const useClinicalHistoryForm = ({ patient, initialData, onCancel, onSave }: ClinicalHistoryFormProps) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [serverErrors, setServerErrors] = React.useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  const form = useForm<ClinicalHistoryFormValues>({
    resolver: zodResolver(clinicalHistorySchema),
    mode: 'onChange',
    defaultValues: {
      document: '',
      name: '',
      edad: '',
      afiliacion: '',
      salud: '',
      ocupacion: '',
      ultimo_control_visual: '',
      tipo_consulta: 'CONSULTA DE PRIMERA VEZ POR OPTOMETRIA',
      tipo_atencion: 'INTRAMURAL',
      causa_externa: 'ENFERMEDAD GENERAL',
      finalidad_consulta: 'OTRA',
      // Acompañante y Responsable fields
      acompañante_no_aplica: true,
      acompañante_nombre: '',
      acompañante_documento: '',
      acompañante_telefono: '',
      responsable_no_aplica: true,
      responsable_nombre: '',
      responsable_documento: '',
      responsable_telefono: '',
      // New fields
      motivo_consulta: '',
      antecedentes_familiares: 'NO REFIERE',
      antecedentes_personales: 'NO REFIERE',
      antecedentes_laborales: 'NO REFIERE',
      ...initialData,
      patient_id: patient?.id || (typeof initialData?.patient_id === 'number' ? initialData.patient_id : 0),
    }
  });

  const { formState: { errors: formErrors, isValid, isDirty } } = form;

  // Watch for checkbox changes and trigger re-validation
  const acompañanteNoAplica = form.watch('acompañante_no_aplica');
  const responsableNoAplica = form.watch('responsable_no_aplica');

  React.useEffect(() => {
    if (acompañanteNoAplica) {
      // Clear errors for acompañante fields when NO APLICA is checked
      form.clearErrors(['acompañante_nombre', 'acompañante_documento']);
      // Clear server errors for acompañante fields
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['acompañante_nombre'];
        delete newErrors['acompañante_documento'];
        return newErrors;
      });
    } else {
      // Trigger validation only for acompañante fields that have content when NO APLICA is unchecked
      const fieldsToValidate = [];
      const nombreValue = form.getValues('acompañante_nombre');
      const documentoValue = form.getValues('acompañante_documento');
      
      if (nombreValue && nombreValue.trim() !== '') {
        fieldsToValidate.push('acompañante_nombre');
      }
      if (documentoValue && documentoValue.trim() !== '') {
        fieldsToValidate.push('acompañante_documento');
      }
      
      if (fieldsToValidate.length > 0) {
        form.trigger(fieldsToValidate);
      }
    }
  }, [acompañanteNoAplica, form]);

  React.useEffect(() => {
    if (responsableNoAplica) {
      // Clear errors for responsable fields when NO APLICA is checked
      form.clearErrors(['responsable_nombre', 'responsable_documento']);
      // Clear server errors for responsable fields
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['responsable_nombre'];
        delete newErrors['responsable_documento'];
        return newErrors;
      });
    } else {
      // Trigger validation only for responsable fields that have content when NO APLICA is unchecked
      const fieldsToValidate = [];
      const nombreValue = form.getValues('responsable_nombre');
      const documentoValue = form.getValues('responsable_documento');
      
      if (nombreValue && nombreValue.trim() !== '') {
        fieldsToValidate.push('responsable_nombre');
      }
      if (documentoValue && documentoValue.trim() !== '') {
        fieldsToValidate.push('responsable_documento');
      }
      
      if (fieldsToValidate.length > 0) {
        form.trigger(fieldsToValidate);
      }
    }
  }, [responsableNoAplica, form]);

  const onSubmit = async (values: ClinicalHistoryFormValues) => {
    // Ensure patient_id is set
    if (!values.patient_id || values.patient_id === 0) {
      setError('Error: ID del paciente no encontrado');
      return;
    }

    setLoading(true);
    setError(null);
    setServerErrors({});
    
    try {
      let response;
      
      if (initialData?.id) {
        response = await api.put(`/api/v1/clinical-histories/${initialData.id}`, values);
      } else {
        response = await api.post('/api/v1/clinical-histories', values);
      }
      
      onSave(response.data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      
      if (apiError.response?.data?.errors) {
        setServerErrors(apiError.response.data.errors);
        setError('Por favor corrige los errores en el formulario');
      } else {
        setError(apiError.response?.data?.error || 'Error al guardar la historia clínica');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const getSectionStatus = (section: SectionDefinition) => {
    const sectionFields = section.fields.map(f => f.name);
    const hasErrors = sectionFields.some(field => 
      formErrors[field as keyof ClinicalHistoryFormValues] || serverErrors[field]
    );
    
    // Special handling for "Información Adicional" section
    if (section.title === "Información Adicional") {
      // Check if both NO APLICA checkboxes are checked
      const acompañanteNoAplica = form.getValues('acompañante_no_aplica');
      const responsableNoAplica = form.getValues('responsable_no_aplica');
      
      // If both are checked, no requirements needed
      if (acompañanteNoAplica && responsableNoAplica) {
        return hasErrors ? 'error' : 'completed';
      }
      
      // Check required fields based on checkbox states
      let requiredFieldsFilled = true;
      
      if (!acompañanteNoAplica) {
        const acompañanteFields = ['acompañante_nombre', 'acompañante_documento'];
        requiredFieldsFilled = requiredFieldsFilled && acompañanteFields.every(field => {
          const value = form.getValues(field as keyof ClinicalHistoryFormValues);
          return value && value !== '';
        });
      }
      
      if (!responsableNoAplica) {
        const responsableFields = ['responsable_nombre', 'responsable_documento'];
        requiredFieldsFilled = requiredFieldsFilled && responsableFields.every(field => {
          const value = form.getValues(field as keyof ClinicalHistoryFormValues);
          return value && value !== '';
        });
      }
      
      if (hasErrors) return 'error';
      if (requiredFieldsFilled) return 'completed';
      return 'empty';
    }
    
    // Default logic for other sections
    const requiredFields = section.fields.filter(f => f.required).map(f => f.name);
    const requiredFieldsFilled = requiredFields.every(field => {
      const value = form.getValues(field as keyof ClinicalHistoryFormValues);
      return value && value !== '' && value !== 0;
    });

    if (hasErrors) return 'error';
    if (requiredFieldsFilled && requiredFields.length > 0) return 'completed';
    return 'empty';
  };

  // Get all current errors for display
  const getAllErrors = () => {
    const errors: Array<{ field: string; message: string; section: string }> = [];
    
    // Client-side validation errors
    Object.entries(formErrors).forEach(([field, error]) => {
      if (error?.message) {
        errors.push({
          field: field,
          message: error.message,
          section: 'General'
        });
      }
    });

    // Server-side validation errors
    Object.entries(serverErrors).forEach(([field, messages]) => {
      if (messages && messages.length > 0) {
        errors.push({
          field: field,
          message: messages[0],
          section: 'General'
        });
      }
    });

    return errors;
  };

  const allErrors = getAllErrors();
  const hasAnyErrors = allErrors.length > 0;

  return {
    form,
    loading,
    error,
    serverErrors,
    expandedSections,
    setExpandedSections,
    formErrors,
    isValid,
    isDirty,
    hasAnyErrors,
    allErrors,
    onSubmit,
    toggleSection,
    getSectionStatus,
    onCancel,
    initialData
  };
}; 