import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, FormControl } from '@mui/material';
import { SectionProps, FieldDefinition } from '../../types';

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

  // Local state for oftalmoscopia data
  const [oftalmoscopiaData, setOftalmoscopiaData] = useState(() => {
    const initialDataWithDefaults: { [key: string]: string } = {};
    
    // Set pupil examination defaults
    Object.entries(pupilDefaults).forEach(([key, defaultValue]) => {
      if (isEditing && Object.keys(initialData).length > 0) {
        initialDataWithDefaults[key] = initialData[key] ?? '';
      } else {
        initialDataWithDefaults[key] = initialData[key] ?? defaultValue;
      }
    });

    // Set fundoscopy defaults  
    Object.entries(fundoscopyDefaults).forEach(([key, defaultValue]) => {
      if (isEditing && Object.keys(initialData).length > 0) {
        initialDataWithDefaults[key] = initialData[key] ?? '';
      } else {
        initialDataWithDefaults[key] = initialData[key] ?? defaultValue;
      }
    });
    
    initialDataWithDefaults.observaciones = initialData.observaciones ?? '';
    return initialDataWithDefaults;
  });

  const handleFieldChange = (fieldName: string, value: string) => {
    setOftalmoscopiaData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    onSave(oftalmoscopiaData);
  };

  const pupilOptions = [
    { value: "Normoreactivo", label: "Normoreactivo" },
    { value: "Alterado", label: "Alterado" }
  ];

  return (
    <Box sx={{ 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      width: '100%',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 2,
      color: 'black'
    }}>
      {/* Header */}
      <Typography variant="h5" sx={{ 
        fontWeight: 600, 
        textAlign: 'center',
        color: 'black',
        mb: 2
      }}>
        {isEditing ? 'Editar Oftalmoscopia' : 'Oftalmoscopia'}
      </Typography>

      {/* Examen pupilar Section */}
      <Box sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        p: 2,
        backgroundColor: 'white',
        color: 'black'
      }}>
        <Typography variant="h6" sx={{ 
          color: 'black',
          mb: 2,
          fontWeight: 600
        }}>
          Examen pupilar
        </Typography>

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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
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
              sx={{ 
                backgroundColor: 'white', 
                fontSize: '0.85rem',
                border: '1px solid #e0e0e0'
              }}
            >
              {pupilOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Oftalmoscopia Section */}
      <Box sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        p: 2,
        backgroundColor: 'white',
        color: 'black'
      }}>
        <Typography variant="h6" sx={{ 
          color: 'black',
          mb: 2,
          fontWeight: 600
        }}>
          Oftalmoscopia
        </Typography>

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
                '& .MuiInputBase-root': {
                  backgroundColor: 'white',
                  fontSize: '0.85rem',
                  height: '32px',
                  border: '1px solid #e0e0e0',
                  '& input': {
                    color: 'black'
                  }
                }
              }}
            />
            <TextField
              size="small"
              value={oftalmoscopiaData[`${field.key}_oi`] || ''}
              onChange={(e) => handleFieldChange(`${field.key}_oi`, e.target.value)}
              sx={{ 
                flex: 1,
                '& .MuiInputBase-root': {
                  backgroundColor: 'white',
                  fontSize: '0.85rem',
                  height: '32px',
                  border: '1px solid #e0e0e0',
                  '& input': {
                    color: 'black'
                  }
                }
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
          value={oftalmoscopiaData.observaciones || ''}
          onChange={(e) => handleFieldChange('observaciones', e.target.value)}
          sx={{ 
            width: '100%',
            '& .MuiInputBase-root': {
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              '& textarea': {
                color: 'black'
              }
            }
          }}
        />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        display: 'flex',
        gap: 2,
        justifyContent: 'center',
        mt: 3
      }}>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            backgroundColor: '#2B5797',
            color: 'white',
            minWidth: '120px',
            '&:hover': {
              backgroundColor: '#1e3f6f'
            },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Guardar
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            borderColor: '#2B5797',
            color: '#2B5797',
            minWidth: '120px',
            '&:hover': {
              borderColor: '#1e3f6f',
              backgroundColor: 'rgba(43, 87, 151, 0.1)'
            },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};

export default OftalmoscopiaSection; 