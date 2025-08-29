import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { SectionProps, FieldDefinition } from '../../types';
import UnsavedChangesWarning from '../../../../shared/UnsavedChangesWarning';

interface BiomicroscopiaSectionProps extends SectionProps {
  onSave: (data: { [key: string]: string }) => void;
  onCancel: () => void;
  initialData?: { [key: string]: string };
  isEditing?: boolean;
}

const BiomicroscopiaSection: React.FC<BiomicroscopiaSectionProps> = ({ 
  form, 
  serverErrors, 
  renderField, 
  onSave, 
  onCancel,
  initialData = {},
  isEditing = false
}) => {
  const eyeStructures = [
    { key: 'cejas', label: 'Cejas' },
    { key: 'pestanas', label: 'Pestañas' },
    { key: 'parpados', label: 'Párpados' },
    { key: 'conjuntiva', label: 'Conjuntiva' },
    { key: 'esclerotica', label: 'Esclerótica' },
    { key: 'cornea', label: 'Córnea' },
    { key: 'iris', label: 'Iris' },
    { key: 'pupila', label: 'Pupila' },
    { key: 'cristalino', label: 'Cristalino' }
  ];

  // Default values for each field type
  const defaultValues = {
    cejas: "Presentes y completas",
    pestanas: "Presentes y completas", 
    parpados: "Dóciles",
    conjuntiva: "Transparente",
    esclerotica: "Sin alteración",
    cornea: "Transparente",
    iris: "Completo",
    pupila: "Normoreactiva",
    cristalino: "Transparente"
  };

  // Create initial data with defaults - this will be our reference for change detection
  const initialDataWithDefaults = useMemo(() => {
    const data: { [key: string]: string } = {};
    
    eyeStructures.forEach(structure => {
      const defaultValue = defaultValues[structure.key as keyof typeof defaultValues];
      
      // If we're editing and have existing data, use it as-is (including empty strings)
      // If we're creating new and no existing data, use defaults
      if (isEditing && Object.keys(initialData).length > 0) {
        data[`od_${structure.key}`] = initialData[`od_${structure.key}`] ?? '';
        data[`oi_${structure.key}`] = initialData[`oi_${structure.key}`] ?? '';
      } else {
        // Only use defaults for completely new entries
        data[`od_${structure.key}`] = initialData[`od_${structure.key}`] ?? defaultValue;
        data[`oi_${structure.key}`] = initialData[`oi_${structure.key}`] ?? defaultValue;
      }
    });
    
    data.observaciones = initialData.observaciones ?? '';
    return data;
  }, [initialData, isEditing]);

  // Local state for biomicroscopy data
  const [biomicroscopyData, setBiomicroscopyData] = useState(initialDataWithDefaults);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Update local state when initialData changes
  useEffect(() => {
    setBiomicroscopyData(initialDataWithDefaults);
  }, [initialDataWithDefaults]);

  // Check if data has changed from initial state
  const hasChanges = useMemo(() => {
    return Object.keys(biomicroscopyData).some(key => 
      biomicroscopyData[key] !== initialDataWithDefaults[key]
    );
  }, [biomicroscopyData, initialDataWithDefaults]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setBiomicroscopyData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    // Only save if there are changes
    if (hasChanges) {
      onSave(biomicroscopyData);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowUnsavedWarning(false);
    onCancel();
  };

  const handleKeepChanges = () => {
    setShowUnsavedWarning(false);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [hasChanges]);

  return (
    <>
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      minHeight: '90vh',
      position: 'relative'
    }}>
      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'auto'
      }}>
        {/* Header */}
        <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', flexShrink: 0 }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 600, 
            textAlign: 'center',
            color: '#1e293b',
            fontSize: '1.25rem'
          }}>
            {isEditing ? 'Editar Biomicroscopia' : 'Biomicroscopia'}
          </Typography>
        </Box>

        {/* Content Container */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 3,
          flex: 1,
          backgroundColor: '#f8fafc'
        }}>
        {/* Column Headers */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 1
        }}>
        <Typography sx={{ 
          minWidth: '100px',
          fontSize: '0.9rem',
          color: 'transparent' // Invisible placeholder for alignment
        }}>
          
        </Typography>
        
        <Typography variant="h6" sx={{ 
          flex: 1,
          textAlign: 'center',
          color: 'black',
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          Ojo derecho
        </Typography>
        
        <Typography variant="h6" sx={{ 
          flex: 1,
          textAlign: 'center',
          color: 'black',
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          Ojo Izquierdo
        </Typography>
      </Box>

      {/* Main Content - Table layout with headers */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 1,
        p: 2
      }}>
        {eyeStructures.map((structure) => (
          <Box key={structure.key} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            minHeight: '40px'
          }}>
            <Typography sx={{ 
              minWidth: '100px',
              fontSize: '0.9rem',
              color: 'black',
              fontWeight: 500
            }}>
              {structure.label}
            </Typography>
            
            {/* Left eye field (Ojo derecho) */}
            <TextField
              size="small"
              value={biomicroscopyData[`od_${structure.key}`] || ''}
              onChange={(e) => handleFieldChange(`od_${structure.key}`, e.target.value)}
              sx={{ 
                flex: 1,
                bgcolor: 'white'
              }}
            />
            
            {/* Right eye field (Ojo izquierdo) */}
            <TextField
              size="small"
              value={biomicroscopyData[`oi_${structure.key}`] || ''}
              onChange={(e) => handleFieldChange(`oi_${structure.key}`, e.target.value)}
              sx={{ 
                flex: 1,
                bgcolor: 'white'
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Observaciones Section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ 
          color: 'black',
          mb: 1,
          fontWeight: 600
        }}>
          Observaciones
        </Typography>
        <TextField
          multiline
          rows={3}
          value={biomicroscopyData.observaciones || ''}
          onChange={(e) => handleFieldChange('observaciones', e.target.value)}
          sx={{ 
            width: '100%',
            bgcolor: 'white'
          }}
        />
        </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        position: 'sticky',
        bottom: 0,
                  backgroundColor: '#f8fafc',
        borderTop: '2px solid #e2e8f0',
        p: 3,
        display: 'flex',
        gap: 2,
        justifyContent: 'flex-end',
        mt: 'auto',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          sx={{
            borderColor: '#64748b',
            color: '#64748b',
            minWidth: '120px',
            '&:hover': {
              borderColor: '#475569',
              backgroundColor: 'rgba(100, 116, 139, 0.1)'
            },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cancelar
        </Button>
        
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges}
          sx={{
            backgroundColor: hasChanges ? '#2B5797' : '#cccccc',
            color: 'white',
            minWidth: '120px',
            '&:hover': {
              backgroundColor: hasChanges ? '#1e3f6f' : '#cccccc'
            },
            '&:disabled': {
              backgroundColor: '#cccccc',
              color: '#999999'
            },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Guardar
        </Button>
      </Box>
    </Box>

    {/* Unsaved Changes Warning Dialog */}
    <UnsavedChangesWarning
      open={showUnsavedWarning}
      onConfirm={handleConfirmCancel}
      onCancel={handleKeepChanges}
    />
    </>
  );
};

export default BiomicroscopiaSection; 