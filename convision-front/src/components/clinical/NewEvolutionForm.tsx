import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button, Alert, CircularProgress, Paper, Typography, Box, 
  Card, CardContent, Collapse, IconButton, Chip, Divider
} from '@mui/material';
import { ExpandMore, ExpandLess, Error, CheckCircle, CalendarToday } from '@mui/icons-material';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface NewEvolutionFormProps {
  clinicalHistoryId: number;
  appointmentId?: number;
  onCancel: () => void;
  onSave: () => void;
}

interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  rows?: number;
  fullWidth?: boolean;
  compact?: boolean;
}

interface SectionDefinition {
  title: string;
  priority: 'high' | 'medium' | 'low';
  defaultExpanded?: boolean;
  collapsible?: boolean;
  fields: FieldDefinition[];
  icon?: React.ReactNode;
}

const evolutionSchema = z.object({
  clinical_history_id: z.number().optional(),
  appointment_id: z.number().nullable().optional(),
  evolution_date: z.string().min(1, { message: 'La fecha de evolución es requerida' }),
  subjective: z.string()
    .min(1, { message: 'La sección subjetiva es requerida' })
    .max(2000, { message: 'La sección subjetiva no debe exceder 2000 caracteres' }),
  objective: z.string()
    .min(1, { message: 'La sección objetiva es requerida' })
    .max(2000, { message: 'La sección objetiva no debe exceder 2000 caracteres' }),
  assessment: z.string()
    .min(1, { message: 'La evaluación/diagnóstico es requerida' })
    .max(2000, { message: 'La evaluación/diagnóstico no debe exceder 2000 caracteres' }),
  plan: z.string()
    .min(1, { message: 'El plan de tratamiento es requerido' })
    .max(2000, { message: 'El plan de tratamiento no debe exceder 2000 caracteres' }),
  recommendations: z.string().optional().or(z.literal('')),
  right_far_vision: z.string().optional().or(z.literal('')),
  left_far_vision: z.string().optional().or(z.literal('')),
  right_near_vision: z.string().optional().or(z.literal('')),
  left_near_vision: z.string().optional().or(z.literal('')),
  right_eye_sphere: z.string().optional().or(z.literal('')),
  right_eye_cylinder: z.string().optional().or(z.literal('')),
  right_eye_axis: z.string().optional().or(z.literal('')),
  right_eye_visual_acuity: z.string().optional().or(z.literal('')),
  left_eye_sphere: z.string().optional().or(z.literal('')),
  left_eye_cylinder: z.string().optional().or(z.literal('')),
  left_eye_axis: z.string().optional().or(z.literal('')),
  left_eye_visual_acuity: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // If no appointmentId is provided, clinical_history_id is required
  if (!data.appointment_id && !data.clinical_history_id) {
    return false;
  }
  return true;
}, {
  message: "La historia clínica es requerida cuando no se proporciona una cita",
  path: ["clinical_history_id"]
});

type EvolutionFormValues = z.infer<typeof evolutionSchema>;

const NewEvolutionForm: React.FC<NewEvolutionFormProps> = ({
  clinicalHistoryId,
  appointmentId,
  onCancel,
  onSave
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionSchema),
    mode: 'onChange',
    defaultValues: {
      clinical_history_id: appointmentId ? undefined : clinicalHistoryId,
      appointment_id: appointmentId || undefined,
      evolution_date: new Date().toISOString().split('T')[0],
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      recommendations: '',
      right_far_vision: '',
      left_far_vision: '',
      right_near_vision: '',
      left_near_vision: '',
      right_eye_sphere: '',
      right_eye_cylinder: '',
      right_eye_axis: '',
      right_eye_visual_acuity: '',
      left_eye_sphere: '',
      left_eye_cylinder: '',
      left_eye_axis: '',
      left_eye_visual_acuity: '',
    }
  });

  const formErrors = form.formState.errors;

  const sections: SectionDefinition[] = [
    {
      title: "SOAP",
      priority: 'high',
      defaultExpanded: true,
      icon: <CalendarToday sx={{ fontSize: 18 }} />,
      fields: [
        { 
          name: "evolution_date", 
          label: "Fecha", 
          type: "date", 
          required: true,
          compact: true
        },
        { 
          name: "subjective", 
          label: "S - Subjetivo", 
          type: "textarea", 
          required: true,
          placeholder: "Lo que reporta el paciente...",
          rows: 2,
          fullWidth: true
        },
        { 
          name: "objective", 
          label: "O - Objetivo", 
          type: "textarea", 
          required: true,
          placeholder: "Hallazgos del examen...",
          rows: 2,
          fullWidth: true
        },
        { 
          name: "assessment", 
          label: "A - Evaluación", 
          type: "textarea", 
          required: true,
          placeholder: "Diagnóstico y evaluación...",
          rows: 2,
          fullWidth: true
        },
        { 
          name: "plan", 
          label: "P - Plan", 
          type: "textarea", 
          required: true,
          placeholder: "Plan de tratamiento...",
          rows: 2,
          fullWidth: true
        },
        { 
          name: "recommendations", 
          label: "Recomendaciones", 
          type: "textarea",
          placeholder: "Recomendaciones adicionales...",
          rows: 2,
          fullWidth: true
        }
      ]
    },
    {
      title: "Agudeza Visual",
      priority: 'medium',
      collapsible: true,
      fields: [
        { name: "right_far_vision", label: "OD Lejana", type: "text", placeholder: "20/20", compact: true },
        { name: "left_far_vision", label: "OI Lejana", type: "text", placeholder: "20/20", compact: true },
        { name: "right_near_vision", label: "OD Cercana", type: "text", placeholder: "20/20", compact: true },
        { name: "left_near_vision", label: "OI Cercana", type: "text", placeholder: "20/20", compact: true }
      ]
    },
    {
      title: "Mediciones",
      priority: 'low',
      collapsible: true,
      fields: [
        { name: "right_eye_sphere", label: "OD Esf", type: "text", placeholder: "+1.00", compact: true },
        { name: "right_eye_cylinder", label: "OD Cil", type: "text", placeholder: "-0.50", compact: true },
        { name: "right_eye_axis", label: "OD Eje", type: "text", placeholder: "90", compact: true },
        { name: "right_eye_visual_acuity", label: "OD AV", type: "text", placeholder: "20/20", compact: true },
        { name: "left_eye_sphere", label: "OI Esf", type: "text", placeholder: "+1.00", compact: true },
        { name: "left_eye_cylinder", label: "OI Cil", type: "text", placeholder: "-0.50", compact: true },
        { name: "left_eye_axis", label: "OI Eje", type: "text", placeholder: "90", compact: true },
        { name: "left_eye_visual_acuity", label: "OI AV", type: "text", placeholder: "20/20", compact: true }
      ]
    }
  ];

  // Get all current errors for display (same as ClinicalHistoryForm)
  const getAllErrors = () => {
    const errors: Array<{ field: string; message: string; section: string }> = [];
    
    // Client-side validation errors
    Object.entries(formErrors).forEach(([field, error]) => {
      if (error?.message) {
        const section = sections.find(s => s.fields.some(f => f.name === field));
        errors.push({
          field: section?.fields.find(f => f.name === field)?.label || field,
          message: error.message,
          section: section?.title || 'General'
        });
      }
    });

    // Server-side validation errors
    Object.entries(serverErrors).forEach(([field, messages]) => {
      if (messages && messages.length > 0) {
        const section = sections.find(s => s.fields.some(f => f.name === field));
        errors.push({
          field: section?.fields.find(f => f.name === field)?.label || field,
          message: messages[0],
          section: section?.title || 'General'
        });
      }
    });

    return errors;
  };

  const allErrors = getAllErrors();
  const hasAnyErrors = allErrors.length > 0;

  React.useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    sections.forEach(section => {
      initialExpanded[section.title] = section.defaultExpanded || section.priority === 'high';
    });
    setExpandedSections(initialExpanded);
  }, []);

  const onSubmit = async (data: EvolutionFormValues) => {
    setLoading(true);
    setError(null);
    setServerErrors({});

    try {
      let response;
      
      if (appointmentId) {
        // For appointment endpoint, exclude clinical_history_id as it's set automatically by the backend
        const { clinical_history_id, ...appointmentData } = data;
        response = await api.post(
          `/api/v1/appointments/${appointmentId}/evolution`,
          appointmentData
        );
      } else {
        // For general endpoint, include clinical_history_id
        response = await api.post(
          `/api/v1/clinical-evolutions`,
          data
        );
      }

      setLoading(false);
      onSave();
    } catch (err: unknown) {
      setLoading(false);
      
      const error = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; error?: string } } };
      
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setServerErrors(error.response.data.errors);
        setError('Por favor corrige los errores en el formulario');
      } else {
        setError(error.response?.data?.error || 'Error al guardar la evolución');
      }
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const getSectionStatus = (section: SectionDefinition): 'complete' | 'error' | 'incomplete' => {
    const sectionFields = section.fields;
    let hasErrors = false;
    let hasRequiredEmpty = false;

    sectionFields.forEach(field => {
      const fieldName = field.name as keyof EvolutionFormValues;
      const fieldError = formErrors[fieldName] || serverErrors[field.name];
      const fieldValue = form.getValues(fieldName);

      if (fieldError) {
        hasErrors = true;
      }
      if (field.required && (!fieldValue || fieldValue === '')) {
        hasRequiredEmpty = true;
      }
    });

    if (hasErrors) return 'error';
    if (hasRequiredEmpty) return 'incomplete';
    return 'complete';
  };

  const renderSectionHeader = (section: SectionDefinition) => {
    const isExpanded = expandedSections[section.title];
    const status = getSectionStatus(section);
    const isCollapsible = section.collapsible !== false;

    const statusIcon = {
      complete: <CheckCircle sx={{ color: '#10b981', fontSize: 16 }} />,
      error: <Error sx={{ color: '#ef4444', fontSize: 16 }} />,
      incomplete: <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#d1d5db' }} />
    };

    const statusColor = {
      complete: '#10b981',
      error: '#ef4444', 
      incomplete: '#6b7280'
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          cursor: isCollapsible ? 'pointer' : 'default',
          bgcolor: status === 'error' ? '#fef2f2' : 'white',
          borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
          '&:hover': isCollapsible ? { bgcolor: '#f8fafc' } : {}
        }}
        onClick={isCollapsible ? () => toggleSection(section.title) : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {section.icon}
          {statusIcon[status]}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: statusColor[status], fontSize: '0.95rem' }}>
            {section.title}
          </Typography>
          <Chip 
            label={section.priority === 'high' ? 'Requerido' : section.priority === 'medium' ? 'Importante' : 'Opcional'} 
            size="small"
            sx={{ 
              height: 20,
              fontSize: '0.7rem',
              bgcolor: section.priority === 'high' ? '#fef3c7' : section.priority === 'medium' ? '#dbeafe' : '#f3f4f6',
              color: section.priority === 'high' ? '#92400e' : section.priority === 'medium' ? '#1e40af' : '#374151'
            }}
          />
        </Box>
        {isCollapsible && (
          <IconButton size="small" sx={{ p: 0.5 }}>
            {isExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
          </IconButton>
        )}
      </Box>
    );
  };

  const renderField = (field: FieldDefinition) => {
    const fieldName = field.name as keyof EvolutionFormValues;
    const hasError = formErrors[fieldName] || serverErrors[field.name];

    if (field.name === 'clinical_history_id') {
      // Only render if we have a clinical_history_id (when not using appointment endpoint)
      if (!appointmentId && clinicalHistoryId) {
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <input type="hidden" {...formField} value={formField.value as number} />
            )}
          />
        );
      }
      return null;
    }

    if (field.name === 'appointment_id') {
      // Only render if we have an appointment_id
      if (appointmentId) {
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <input type="hidden" {...formField} value={formField.value as number} />
            )}
          />
        );
      }
      return null;
    }

    switch (field.type) {
      case 'text':
      case 'date':
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem className={field.compact ? 'space-y-1' : 'space-y-2'}>
                <FormLabel className={`text-sm ${hasError ? 'text-red-600' : 'text-gray-700'}`}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type={field.type}
                    placeholder={field.placeholder || field.label}
                    value={(formField.value as string) || ''}
                    className={`${hasError ? 'border-red-500' : ''} ${field.compact ? 'h-8 text-sm' : 'h-9'}`}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
                {serverErrors[field.name] && (
                  <p className="text-xs text-red-600">{serverErrors[field.name][0]}</p>
                )}
              </FormItem>
            )}
          />
        );
        
      case 'textarea':
        return (
          <FormField
            key={fieldName}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem className="space-y-1">
                <FormLabel className={`text-sm ${hasError ? 'text-red-600' : 'text-gray-700'}`}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...formField}
                    rows={field.rows || 2}
                    placeholder={field.placeholder || field.label}
                    value={(formField.value as string) || ''}
                    className={`${hasError ? 'border-red-500' : ''} text-sm resize-none`}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
                {serverErrors[field.name] && (
                  <p className="text-xs text-red-600">{serverErrors[field.name][0]}</p>
                )}
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-4"
        >
          <Paper sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#1e293b', 
                mb: 0.5,
                fontSize: '1.1rem'
              }}>
                Nueva Evolución Clínica
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                Complete la información siguiendo el formato SOAP
              </Typography>
            </Box>

            {hasAnyErrors && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                <Typography variant="h6" sx={{ color: '#dc2626', mb: 1, fontSize: '1rem' }}>
                  ⚠️ Errores en el formulario
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {allErrors.map((error, index) => (
                    <Box key={index} sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      mb: 1, 
                      p: 2, 
                      bgcolor: 'white', 
                      borderRadius: 1,
                      border: '1px solid #fecaca'
                    }}>
                      <Box sx={{ 
                        minWidth: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: '#dc2626', 
                        mt: 0.75, 
                        mr: 2 
                      }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#7f1d1d' }}>
                          {error.section} → {error.field}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#991b1b' }}>
                          {error.message}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}

            {error && !hasAnyErrors && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sections.map((section, index) => {
                const isExpanded = expandedSections[section.title];
                const status = getSectionStatus(section);
                
                return (
                  <Card 
                    key={index} 
                    variant="outlined" 
                    sx={{ 
                      overflow: 'hidden',
                      border: status === 'error' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                      bgcolor: status === 'error' ? '#fef2f2' : 'white',
                      borderRadius: 1.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {renderSectionHeader(section)}
                    
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <CardContent sx={{ p: 2, pt: 1.5, bgcolor: 'white' }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: section.title === 'SOAP' ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                          gap: section.title === 'SOAP' ? '16px' : '12px' 
                        }}>
                          {section.fields.map(field => {
                            const renderedField = renderField(field);
                            if (!renderedField) return null;
                            
                            return (
                              <div 
                                key={field.name}
                                style={{
                                  gridColumn: field.fullWidth ? '1 / -1' : 'auto'
                                }}
                              >
                                {renderedField}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Collapse>
                  </Card>
                );
              })}
            </Box>
            
            <Divider sx={{ my: 2.5 }} />
            
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5,
              justifyContent: 'flex-end'
            }}>
              <Button 
                variant="outlined" 
                onClick={onCancel} 
                disabled={loading}
                size="medium"
                sx={{ 
                  minWidth: 100,
                  borderColor: '#64748b',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  '&:hover': {
                    borderColor: '#475569',
                    bgcolor: '#f1f5f9'
                  }
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                size="medium"
                sx={{ 
                  minWidth: 120,
                  fontSize: '0.85rem',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  },
                  '&:disabled': {
                    background: '#9ca3af',
                    color: 'white'
                  }
                }}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
          </Paper>
        </form>
      </Form>
    </Box>
  );
};

export default NewEvolutionForm; 