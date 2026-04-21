import React, { useState, useEffect } from 'react';
import {
  Button, Alert, CircularProgress, Paper, Typography, Box
} from '@mui/material';
import { Form } from '@/components/ui/form';

// Import our modular components
import { SectionDefinition } from './types';

// Define the props interface for this component
interface ClinicalHistoryFormProps {
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  initialData: Record<string, unknown> | null;
  onCancel: () => void;
  onSave: (history: Record<string, unknown>) => void;
}
import { useClinicalHistoryForm } from './hooks/useClinicalHistoryForm';
import { createFieldRenderer } from './utils/fieldHelpers';
import BasicDataSection from './sections/BasicDataSection';
import ConsultationInfoSection from './sections/ConsultationInfoSection';
import CompanionResponsibleSection from './sections/CompanionResponsibleSection';
import LensometrySection from './sections/Lensometry';
import KeratometryRefraccionSection from './sections/Keratometry';
import SubjetivoSection from './sections/Subjetivo/SubjetivoSection';
import DiagnosisSection from './sections/Diagnosis/DiagnosisSection';
import { useClinicalHistoryContext } from '../../context/ClinicalHistoryContext';

// Section Divider Component
interface SectionDividerProps {
  title: string;
  children: React.ReactNode;
}

const SectionDivider: React.FC<SectionDividerProps> = ({ 
  title, 
  children 
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {/* Section Title with Line */}
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: '#e2e8f0',
            zIndex: 1
          }}
        />
        <Typography
          variant="body2"
          sx={{
            display: 'inline-block',
            bgcolor: '#e2e8f0',
            px: 2,
            py: 0.5,
            color: 'black',
            fontSize: '0.875rem',
            fontWeight: 600,
            position: 'relative',
            zIndex: 2,
            border: '1px solid #e2e8f0',
            borderRadius: 1
          }}
        >
          {title}
        </Typography>
      </Box>
      
      {/* Section Content */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};

const ClinicalHistoryTab: React.FC<ClinicalHistoryFormProps> = (props) => {
  const { formData: globalFormData, updateTabData } = useClinicalHistoryContext();
  const {
    form,
    loading,
    error,
    serverErrors,
    formErrors,
    isValid,
    isDirty,
    hasAnyErrors,
    allErrors,
    onSubmit,
    onCancel,
    initialData
  } = useClinicalHistoryForm(props);

  // State to track active modal and section
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [focusedButton, setFocusedButton] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  // Load any draft data from context into the react-hook-form on mount
  useEffect(() => {
    if (globalFormData?.clinicalHistoryTab) {
      form.reset({
        ...form.getValues(),
        ...(globalFormData.clinicalHistoryTab as Record<string, unknown>)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form changes into the global context for autosave
  useEffect(() => {
    const subscription = form.watch((values) => {
      updateTabData('clinicalHistoryTab', values as Record<string, unknown>);
    });
    return () => subscription.unsubscribe();
  }, [form, updateTabData]);

  // Create the field renderer with current form state
  const renderField = createFieldRenderer(form, formErrors, serverErrors);

  // Sections configuration
  const sections: SectionDefinition[] = [
    {
      title: "Datos Básicos",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Información de Consulta",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Información Adicional",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Lensometría",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Queratometría y Refracción",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Subjetivo",
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Diagnóstico",
      fields: [] // Fields are handled by the section component
    }
  ];

  const renderSectionContent = (section: SectionDefinition) => {
    const sectionProps = { 
      form, 
      serverErrors, 
      renderField,
      onModalOpen: (modalName: string, buttonId: string) => {
        setActiveModal(modalName);
        setActiveSection(section.title);
        setFocusedButton(buttonId);
      },
      onModalClose: () => {
        setActiveModal(null);
        setActiveSection(null);
        setFocusedButton(null);
      },
      isModalActive: activeModal === 'reopen' && activeSection === section.title
    };
    
    switch (section.title) {
      case "Datos Básicos":
        return <BasicDataSection {...sectionProps} />;
      case "Información de Consulta":
        return <ConsultationInfoSection {...sectionProps} />;
      case "Lensometría":
        return <LensometrySection {...sectionProps} />;
      case "Queratometría y Refracción":
        return <KeratometryRefraccionSection {...sectionProps} />;
      case "Subjetivo":
        return <SubjetivoSection {...sectionProps} />;
      case "Diagnóstico":
        return <DiagnosisSection {...sectionProps} />;
      case "Información Adicional":
        return <CompanionResponsibleSection {...sectionProps} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Global Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Form Sections */}
          {sections.map((section, index) => {
            return (
              <SectionDivider
                key={index} 
                title={section.title}
              >
                {renderSectionContent(section)}
              </SectionDivider>
            );
          })}
          
          {/* Form Actions */}
          <Paper sx={{ 
            p: 4, 
            mt: 4, 
            bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            border: '1px solid #cbd5e1'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
                  Estado del formulario
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {isDirty ? '📝 Hay cambios sin guardar' : '✅ No hay cambios pendientes'}
                  </Typography>
                  {hasAnyErrors && (
                    <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500 }}>
                      ❌ {allErrors.length} error{allErrors.length !== 1 ? 'es' : ''} encontrado{allErrors.length !== 1 ? 's' : ''}
                    </Typography>
                  )}
                  {isValid && isDirty && (
                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 500 }}>
                      ✅ Formulario válido y listo para guardar
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={onCancel} 
                  disabled={loading}
                  size="large"
                  sx={{ 
                    minWidth: 120,
                    borderColor: '#64748b',
                    color: '#64748b',
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
                  disabled={loading || hasAnyErrors}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  size="large"
                  sx={{ 
                    minWidth: 140,
                    background: hasAnyErrors ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: hasAnyErrors ? '#9ca3af' : 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    },
                    '&:disabled': {
                      background: '#9ca3af',
                      color: 'white'
                    }
                  }}
                >
                  {loading ? 'Guardando...' : (initialData?.id ? 'Actualizar Historia' : 'Crear Historia')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </form>
      </Form>
    </Box>
  );
};

export default ClinicalHistoryTab;
