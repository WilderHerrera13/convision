import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl } from '@mui/material';
import { SectionProps, FieldDefinition } from '../../types';
import UnsavedChangesWarning from '../../../../shared/UnsavedChangesWarning';

// Section Divider Component (extracted from ClinicalHistoryTab)
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

interface OftalmoscopiaSectionProps extends SectionProps {
  onSave: (data: { [key: string]: string }) => void;
  onCancel: () => void;
  initialData?: { [key: string]: string };
  isEditing?: boolean;
}

const OftalmoscopiaSection: React.FC<OftalmoscopiaSectionProps> = ({ 
  form, 
  serverErrors, 
  renderField, 
  onSave, 
  onCancel,
  initialData = {},
  isEditing = false
}) => {
  // Default values for pupil examination
  const pupilDefaults = {
    fotomotor_directo_od: "Normoreactivo",
    fotomotor_directo_oi: "Normoreactivo",
    consensual_od: "Normoreactivo", 
    consensual_oi: "Normoreactivo",
    acomodativo_od: "Normoreactivo",
    acomodativo_oi: "Normoreactivo"
  };

  // Default values for fundoscopy
  const fundoscopyDefaults = {
    color_od: "Rojo - Naranja",
    color_oi: "Rojo - Naranja",
    papila_od: "Definida",
    papila_oi: "Definida",
    excavacion_od: "",
    excavacion_oi: "",
    r_arteria_vena_od: "2/3",
    r_arteria_vena_oi: "2/3", 
    macula_od: "Avascular",
    macula_oi: "Avascular",
    brillo_foveal_od: "Presente",
    brillo_foveal_oi: "Presente",
    fijacion_od: "Central",
    fijacion_oi: "Central"
  };

  // Create initial data with defaults - this will be our reference for change detection
  const initialDataWithDefaults = useMemo(() => {
    const data: { [key: string]: string } = {};
    
    // Set pupil examination defaults
    Object.entries(pupilDefaults).forEach(([key, defaultValue]) => {
      if (isEditing && Object.keys(initialData).length > 0) {
        data[key] = initialData[key] ?? '';
      } else {
        data[key] = initialData[key] ?? defaultValue;
      }
    });

    // Set fundoscopy defaults  
    Object.entries(fundoscopyDefaults).forEach(([key, defaultValue]) => {
      if (isEditing && Object.keys(initialData).length > 0) {
        data[key] = initialData[key] ?? '';
      } else {
        data[key] = initialData[key] ?? defaultValue;
      }
    });
    
    data.observaciones = initialData.observaciones ?? '';
    return data;
  }, [initialData, isEditing]);

  // Local state for oftalmoscopia data
  const [oftalmoscopiaData, setOftalmoscopiaData] = useState(initialDataWithDefaults);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Update local state when initialData changes
  useEffect(() => {
    setOftalmoscopiaData(initialDataWithDefaults);
  }, [initialDataWithDefaults]);

  // Check if data has changed from initial state
  const hasChanges = useMemo(() => {
    return Object.keys(oftalmoscopiaData).some(key => 
      oftalmoscopiaData[key] !== initialDataWithDefaults[key]
    );
  }, [oftalmoscopiaData, initialDataWithDefaults]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setOftalmoscopiaData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    // Only save if there are changes
    if (hasChanges) {
    onSave(oftalmoscopiaData);
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

  const pupilOptions = [
    { value: "Normoreactivo", label: "Normoreactivo" },
    { value: "Alterado", label: "Alterado" }
  ];

  return (
    <>
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      maxHeight: '90vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', flexShrink: 0 }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          textAlign: 'center',
          color: '#1e293b',
          fontSize: '1.25rem'
        }}>
          {isEditing ? 'Editar Oftalmoscopia' : 'Oftalmoscopia'}
        </Typography>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'auto',
        minHeight: 0
      }}>
        {/* Content Container */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 3,
          backgroundColor: '#f8fafc'
        }}>
        {/* Examen pupilar Section */}
        <SectionDivider title="Examen pupilar">

        {/* Column Headers for Pupil Exam */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 1
        }}>
          <Typography sx={{ minWidth: '120px', color: 'transparent' }}></Typography>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'black' }}>
            Fotomotor directo
          </Typography>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'black' }}>
            Consensual
          </Typography>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'black' }}>
            Acomodativo
          </Typography>
        </Box>

        {/* OD Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
          <Typography sx={{ minWidth: '120px', fontWeight: 600, color: 'black' }}>OD</Typography>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.fotomotor_directo_od || ''}
              onChange={(e) => handleFieldChange('fotomotor_directo_od', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.consensual_od || ''}
              onChange={(e) => handleFieldChange('consensual_od', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.acomodativo_od || ''}
              onChange={(e) => handleFieldChange('acomodativo_od', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* OI Row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography sx={{ minWidth: '120px', fontWeight: 600, color: 'black' }}>OI</Typography>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.fotomotor_directo_oi || ''}
              onChange={(e) => handleFieldChange('fotomotor_directo_oi', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.consensual_oi || ''}
              onChange={(e) => handleFieldChange('consensual_oi', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={oftalmoscopiaData.acomodativo_oi || ''}
              onChange={(e) => handleFieldChange('acomodativo_oi', e.target.value)}
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    maxHeight: 200
                  }
                }
              }}
              sx={{ 
                bgcolor: 'white'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        </SectionDivider>

        {/* Oftalmoscopia Section */}
        <SectionDivider title="Oftalmoscopia">

        {/* Column Headers */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 1
        }}>
          <Typography sx={{ minWidth: '120px', color: 'transparent' }}></Typography>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'black' }}>
            Ojo derecho
          </Typography>
          <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 600, color: 'black' }}>
            Ojo Izquierdo
          </Typography>
        </Box>

        {/* Fundoscopy Fields */}
        {[
          { key: 'color', label: 'Color' },
          { key: 'papila', label: 'Papila' },
          { key: 'excavacion', label: 'Excavación' },
          { key: 'r_arteria_vena', label: 'R Arteria/Vena' },
          { key: 'macula', label: 'Mácula' },
          { key: 'brillo_foveal', label: 'Brillo Foveal' },
          { key: 'fijacion', label: 'Fijación' }
        ].map((field) => (
          <Box key={field.key} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
            <Typography sx={{ minWidth: '120px', fontWeight: 500, color: 'black' }}>
              {field.label}
            </Typography>
            <TextField
              size="small"
              value={oftalmoscopiaData[`${field.key}_od`] || ''}
              onChange={(e) => handleFieldChange(`${field.key}_od`, e.target.value)}
              sx={{ 
                flex: 1,
                bgcolor: 'white'
              }}
            />
            <TextField
              size="small"
              value={oftalmoscopiaData[`${field.key}_oi`] || ''}
              onChange={(e) => handleFieldChange(`${field.key}_oi`, e.target.value)}
              sx={{ 
                flex: 1,
                bgcolor: 'white'
              }}
            />
          </Box>
        ))}
        </SectionDivider>

      {/* Observaciones Section */}
      <SectionDivider title="Observaciones">
        <TextField
          multiline
          rows={3}
          value={oftalmoscopiaData.observaciones || ''}
          onChange={(e) => handleFieldChange('observaciones', e.target.value)}
          sx={{ 
            width: '100%',
            bgcolor: 'white'
          }}
        />
        </SectionDivider>
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

export default OftalmoscopiaSection; 