import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { Add, Remove, CursorDefault } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../types';

interface DiagnosticoCIE {
  id: string;
  code: string;
  description: string;
  timestamp: string;
}

const DiagnosticoSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const [diagnosticosCIE, setDiagnosticosCIE] = useState<DiagnosticoCIE[]>([]);

  // Options for Recomendacion
  const recomendacionOptions = [
    { value: 'POLY VI/AR /VI SUN', label: 'POLY VI/AR /VI SUN' },
    { value: 'LENTES MONOFOCALES', label: 'LENTES MONOFOCALES' },
    { value: 'LENTES BIFOCALES', label: 'LENTES BIFOCALES' },
    { value: 'LENTES PROGRESIVOS', label: 'LENTES PROGRESIVOS' },
    { value: 'CONTROL POSTERIOR', label: 'CONTROL POSTERIOR' },
  ];

  // Options for Tipo de diagnóstico
  const tipoDiagnosticoOptions = [
    { value: 'IMPRESION_DIAGNOSTICA', label: 'Impresión diagnóstica' },
    { value: 'CONFIRMADO_NUEVO', label: 'Confirmado nuevo' },
    { value: 'CONFIRMADO_REPETIDO', label: 'Confirmado repetido' },
  ];

  // Mock options for Profesional (these should come from an API)
  const profesionalOptions = [
    { value: 'paula_valderrama', label: 'Paula Alejandra Valderrama García' },
    { value: 'dr_martinez', label: 'Dr. Juan Martínez' },
    { value: 'dra_lopez', label: 'Dra. María López' },
  ];

  const fields: FieldDefinition[] = [
    { 
      name: "recomendacion", 
      label: "Recomendación", 
      type: "select",
      options: recomendacionOptions
    },
    { 
      name: "tipo_diagnostico", 
      label: "Tipo diagnóstico", 
      type: "select",
      options: tipoDiagnosticoOptions
    },
    { 
      name: "n_dispositivos_medicos", 
      label: "N° dispositivos médicos", 
      type: "text",
      placeholder: "0"
    },
    { 
      name: "profesional", 
      label: "Profesional", 
      type: "select",
      options: profesionalOptions
    },
    { 
      name: "proximo_control_visual", 
      label: "Próximo control visual", 
      type: "text",
      placeholder: "DD/MM/YYYY"
    },
  ];

  const handleRecomendacionButton = () => {
    // Placeholder for future functionality - cursor button next to Recomendacion
    console.log('Recomendacion cursor button clicked');
  };

  const handleAddDiagnosticoCIE = () => {
    // Placeholder for adding CIE-10 diagnostic
    const newDiagnostico: DiagnosticoCIE = {
      id: `cie_${Date.now()}`,
      code: 'CIE10',
      description: 'Diagnóstico',
      timestamp: new Date().toLocaleString()
    };
    setDiagnosticosCIE([...diagnosticosCIE, newDiagnostico]);
  };

  const handleRemoveDiagnosticoCIE = (id: string) => {
    setDiagnosticosCIE(diagnosticosCIE.filter(d => d.id !== id));
  };

  return (
    <Box sx={{ 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%'
    }}>
      {/* Main Container */}
      <Box sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        p: 2,
        backgroundColor: 'white'
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          fontSize: '1rem',
          mb: 2,
          textAlign: 'left',
          color: '#000'
        }}>
          Diagnóstico
        </Typography>
        
        {/* Top Row - Recomendacion and Tipo diagnostico */}
        <Box sx={{ 
          display: 'flex',
          gap: 2,
          mb: 2
        }}>
          {/* Recomendacion with cursor button */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              {renderField(fields.find(f => f.name === 'recomendacion')!)}
            </Box>
            <IconButton
              onClick={handleRecomendacionButton}
              sx={{
                backgroundColor: '#f5f5f5',
                '&:hover': {
                  backgroundColor: '#e0e0e0'
                },
                width: 40,
                height: 40,
                mb: 0.5
              }}
            >
              <CursorDefault />
            </IconButton>
          </Box>

          {/* Tipo diagnostico */}
          <Box sx={{ flex: 1 }}>
            {renderField(fields.find(f => f.name === 'tipo_diagnostico')!)}
          </Box>
        </Box>

        {/* Second Row - N dispositivos medicos */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ width: '200px' }}>
            {renderField(fields.find(f => f.name === 'n_dispositivos_medicos')!)}
          </Box>
        </Box>

        {/* Third Row - Diagnosticos CIE-10 with buttons */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 1
          }}>
            <Typography sx={{ 
              fontSize: '0.875rem', 
              fontWeight: 500,
              minWidth: 'fit-content'
            }}>
              Diagnósticos CIE - 10
            </Typography>
            
            {/* Add and Remove buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                onClick={handleAddDiagnosticoCIE}
                sx={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: '#45a049'
                  }
                }}
              >
                <Add sx={{ fontSize: '1.2rem' }} />
              </IconButton>
              
              <IconButton
                onClick={() => {
                  if (diagnosticosCIE.length > 0) {
                    handleRemoveDiagnosticoCIE(diagnosticosCIE[diagnosticosCIE.length - 1].id);
                  }
                }}
                sx={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: '#d32f2f'
                  }
                }}
              >
                <Remove sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Box>
          </Box>

          {/* History container for CIE-10 diagnostics */}
          <Box sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {diagnosticosCIE.length === 0 ? (
              <Typography sx={{ 
                color: '#666', 
                fontSize: '0.875rem',
                textAlign: 'center',
                py: 2
              }}>
                No hay diagnósticos CIE-10 registrados
              </Typography>
            ) : (
              diagnosticosCIE.map((diagnostico) => (
                <Chip
                  key={diagnostico.id}
                  label={`${diagnostico.code} - ${diagnostico.description} (${diagnostico.timestamp})`}
                  onDelete={() => handleRemoveDiagnosticoCIE(diagnostico.id)}
                  size="small"
                  sx={{
                    justifyContent: 'flex-start',
                    backgroundColor: '#e8f5e8',
                    color: '#2e7d32',
                    '&:hover': {
                      backgroundColor: '#c8e6c9',
                    },
                    alignSelf: 'flex-start',
                    maxWidth: '100%'
                  }}
                />
              ))
            )}
          </Box>
        </Box>

        {/* Bottom Row - Profesional and Proximo control visual */}
        <Box sx={{ 
          display: 'flex',
          gap: 2
        }}>
          {/* Profesional */}
          <Box sx={{ flex: 1 }}>
            {renderField(fields.find(f => f.name === 'profesional')!)}
          </Box>

          {/* Proximo control visual */}
          <Box sx={{ flex: 1 }}>
            {renderField(fields.find(f => f.name === 'proximo_control_visual')!)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DiagnosticoSection;
