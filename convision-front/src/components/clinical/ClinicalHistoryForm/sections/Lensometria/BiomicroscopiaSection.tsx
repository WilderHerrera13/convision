import React, { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { SectionProps, FieldDefinition } from '../../types';

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

  // Local state for biomicroscopy data
  const [biomicroscopyData, setBiomicroscopyData] = useState(() => {
    const initialDataWithDefaults: { [key: string]: string } = {};
    
    eyeStructures.forEach(structure => {
      const defaultValue = defaultValues[structure.key as keyof typeof defaultValues];
      
      // If we're editing and have existing data, use it as-is (including empty strings)
      // If we're creating new and no existing data, use defaults
      if (isEditing && Object.keys(initialData).length > 0) {
        initialDataWithDefaults[`od_${structure.key}`] = initialData[`od_${structure.key}`] ?? '';
        initialDataWithDefaults[`oi_${structure.key}`] = initialData[`oi_${structure.key}`] ?? '';
      } else {
        // Only use defaults for completely new entries
        initialDataWithDefaults[`od_${structure.key}`] = initialData[`od_${structure.key}`] ?? defaultValue;
        initialDataWithDefaults[`oi_${structure.key}`] = initialData[`oi_${structure.key}`] ?? defaultValue;
      }
    });
    
    initialDataWithDefaults.observaciones = initialData.observaciones ?? '';
    return initialDataWithDefaults;
  });

  const handleFieldChange = (fieldName: string, value: string) => {
    setBiomicroscopyData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    // Pass the biomicroscopyData to the parent component
    onSave(biomicroscopyData);
  };

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
        {isEditing ? 'Editar Biomicroscopia' : 'Biomicroscopia'}
      </Typography>

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
        backgroundColor: 'white',
        borderRadius: 1,
        p: 2,
        border: '1px solid #e0e0e0'
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
            
            {/* Right eye field (Ojo izquierdo) */}
            <TextField
              size="small"
              value={biomicroscopyData[`oi_${structure.key}`] || ''}
              onChange={(e) => handleFieldChange(`oi_${structure.key}`, e.target.value)}
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
          value={biomicroscopyData.observaciones || ''}
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

export default BiomicroscopiaSection; 