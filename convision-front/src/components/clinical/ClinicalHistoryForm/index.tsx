import React from 'react';
import {
  Button, Alert, CircularProgress, Paper, Typography, Box, 
  Card, CardContent, Collapse, IconButton, Chip
} from '@mui/material';
import { ExpandMore, ExpandLess, Error, CheckCircle } from '@mui/icons-material';
import { Form } from '@/components/ui/form';

// Import our modular components
import { ClinicalHistoryFormProps, SectionDefinition } from './types';
import { useClinicalHistoryForm } from './hooks/useClinicalHistoryForm';
import { createFieldRenderer } from './utils/fieldHelpers';
import BasicDataSection from './sections/BasicDataSection';
import ConsultationInfoSection from './sections/ConsultationInfoSection';
import CompanionResponsibleSection from './sections/CompanionResponsibleSection';
import LensometriaSection from './sections/Lensometria';
import QueratometriaRefraccionSection from './sections/Queratometria';

const ClinicalHistoryForm: React.FC<ClinicalHistoryFormProps> = (props) => {
  const {
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
  } = useClinicalHistoryForm(props);

  // Create the field renderer with current form state
  const renderField = createFieldRenderer(form, formErrors, serverErrors);

  // Sections configuration
  const sections: SectionDefinition[] = [
    {
      title: "Datos Básicos",
      priority: 'high',
      defaultExpanded: false,
      collapsible: true,
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Información de Consulta",
      priority: 'high',
      defaultExpanded: false,
      collapsible: true,
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Información Adicional",
      priority: 'medium',
      defaultExpanded: false,
      collapsible: true,
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Queratometría y Refracción",
      priority: 'medium',
      defaultExpanded: false,
      collapsible: true,
      fields: [] // Fields are handled by the section component
    },
    {
      title: "Lensometría",
      priority: 'medium',
      defaultExpanded: false,
      collapsible: true,
      fields: [] // Fields are handled by the section component
    }
  ];

  // Initialize expanded sections based on priority
  React.useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    sections.forEach(section => {
      initialExpanded[section.title] = section.defaultExpanded || false;
    });
    setExpandedSections(initialExpanded);
  }, [setExpandedSections]);

  const renderSectionHeader = (section: SectionDefinition) => {
    const status = getSectionStatus(section);
    const isExpanded = expandedSections[section.title];
    
    const getStatusIcon = () => {
      switch (status) {
        case 'error': return <Error sx={{ color: '#dc2626', fontSize: 20 }} />;
        case 'completed': return <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />;
        default: return null;
      }
    };

    const getPriorityColor = () => {
      switch (section.priority) {
        case 'high': return '#3b82f6';
        case 'medium': return '#f59e0b';
        case 'low': return '#6b7280';
        default: return '#6b7280';
      }
    };
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: section.collapsible ? 'pointer' : 'default',
          p: 3,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: status === 'error' ? '#fef2f2' : '#f8fafc',
          '&:hover': section.collapsible ? {
            bgcolor: status === 'error' ? '#fecaca' : '#f1f5f9'
          } : {}
        }}
        onClick={section.collapsible ? () => toggleSection(section.title) : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: 4, 
            height: 24, 
            bgcolor: getPriorityColor(), 
            borderRadius: 2 
          }} />
          
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: '#1e293b',
            fontSize: '1.1rem'
          }}>
            {section.title}
          </Typography>
          
          {getStatusIcon()}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {section.priority === 'high' && (
              <Chip 
                label="Requerido" 
                size="small" 
                sx={{ 
                  bgcolor: '#dbeafe', 
                  color: '#1e40af',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }} 
              />
            )}
            {status === 'completed' && (
              <Chip 
                label="Completado" 
                size="small" 
                sx={{ 
                  bgcolor: '#dcfce7', 
                  color: '#166534',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }} 
              />
            )}
            {status === 'error' && (
              <Chip 
                label="Con errores" 
                size="small" 
                sx={{ 
                  bgcolor: '#fee2e2', 
                  color: '#991b1b',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }} 
              />
            )}
          </Box>
        </Box>
        
        {section.collapsible && (
          <IconButton 
            size="small"
            sx={{ 
              color: '#64748b',
              '&:hover': {
                bgcolor: 'rgba(100, 116, 139, 0.1)'
              }
            }}
          >
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Box>
    );
  };

  const renderSectionContent = (section: SectionDefinition) => {
    const sectionProps = { form, serverErrors, renderField };
    
    switch (section.title) {
      case "Datos Básicos":
        return <BasicDataSection {...sectionProps} />;
      case "Información de Consulta":
        return <ConsultationInfoSection {...sectionProps} />;
      case "Lensometría":
        return <LensometriaSection {...sectionProps} />;
      case "Queratometría y Refracción":
        return <QueratometriaRefraccionSection {...sectionProps} />;
      case "Información Adicional":
        return <CompanionResponsibleSection {...sectionProps} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Global Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Form Sections */}
          {sections.map((section, index) => {
            const isExpanded = expandedSections[section.title];
            const status = getSectionStatus(section);
            
            return (
              <Card 
                key={index} 
                variant="outlined" 
                sx={{ 
                  overflow: 'visible',
                  border: status === 'error' ? '2px solid #fecaca' : '1px solid #e2e8f0',
                  bgcolor: status === 'error' ? '#fef2f2' : 'white',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {renderSectionHeader(section)}
                
                <Collapse in={isExpanded} timeout="auto">
                  <CardContent sx={{ pt: 2, bgcolor: 'white' }}>
                    {renderSectionContent(section)}
                  </CardContent>
                </Collapse>
              </Card>
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

export default ClinicalHistoryForm; 