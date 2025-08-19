import React from 'react';
import { Box, Typography } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

const CompanionResponsibleSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const fields: FieldDefinition[] = [
    // Acompañante section
    { 
      name: "acompañante_no_aplica", 
      label: "NO APLICA", 
      type: "checkbox"
    },
    { 
      name: "acompañante_nombre", 
      label: "Nombre", 
      type: "text",
      placeholder: "Nombre completo",
      required: true
    },
    { 
      name: "acompañante_documento", 
      label: "Documento", 
      type: "text",
      placeholder: "Número de documento",
      required: true
    },
    { 
      name: "acompañante_telefono", 
      label: "Celular", 
      type: "text",
      placeholder: "Número de celular"
    },
    
    // Responsable section  
    { 
      name: "responsable_no_aplica", 
      label: "NO APLICA", 
      type: "checkbox"
    },
    { 
      name: "responsable_nombre", 
      label: "Nombre", 
      type: "text",
      placeholder: "Nombre completo",
      required: true
    },
    { 
      name: "responsable_documento", 
      label: "Documento", 
      type: "text",
      placeholder: "Número de documento",
      required: true
    },
    { 
      name: "responsable_telefono", 
      label: "Celular", 
      type: "text",
      placeholder: "Número de celular"
    },

    // Motivo Consulta
    { 
      name: "motivo_consulta", 
      label: "", 
      type: "textarea",
      placeholder: "Describa el motivo de la consulta"
    },

    // Antecedentes
    { 
      name: "antecedentes_familiares", 
      label: "Familiares", 
      type: "textarea",
      placeholder: "Antecedentes familiares"
    },
    { 
      name: "antecedentes_personales", 
      label: "Personales", 
      type: "textarea",
      placeholder: "Antecedentes personales"
    },
    { 
      name: "antecedentes_laborales", 
      label: "Laborales", 
      type: "textarea",
      placeholder: "Antecedentes laborales"
    }
  ];

  return (
    <Box sx={{ 
      bgcolor: '#fafbfc',
      borderRadius: 3,
      p: 0,
      overflow: 'hidden'
    }}>
      {/* Vertical layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Acompañante y Responsable Combined Section */}
        <Box sx={{
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 3,
          m: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          {/* Acompañante Subsection */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 500, 
              fontSize: '0.9rem',
              mb: 2,
              color: '#475569'
            }}>
              Acompañante
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '120px 1fr 180px 180px' }, 
              gap: 3,
              alignItems: 'start'
            }}>
              {fields.filter(field => field.name.startsWith('acompañante_')).map(field => {
                const renderedField = renderField(field);
                if (!renderedField) return null;
                
                return (
                  <Box key={field.name} sx={{ minWidth: 0, overflow: 'hidden' }}>
                    {renderedField}
                  </Box>
                );
              })}
            </Box>
          </Box>
          
          {/* Responsable Subsection */}
          <Box>
            <Typography variant="subtitle1" sx={{ 
              fontWeight: 500, 
              fontSize: '0.9rem',
              mb: 2,
              color: '#475569'
            }}>
              Responsable
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '120px 1fr 180px 180px' }, 
              gap: 3,
              alignItems: 'start'
            }}>
              {fields.filter(field => field.name.startsWith('responsable_')).map(field => {
                const renderedField = renderField(field);
                if (!renderedField) return null;
                
                return (
                  <Box key={field.name} sx={{ minWidth: 0, overflow: 'hidden' }}>
                    {renderedField}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Motivo Consulta Section */}
        <Box sx={{
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 3,
          m: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 3,
            color: '#1e293b',
            pb: 1,
            borderBottom: '2px solid #f1f5f9'
          }}>
            Motivo Consulta
          </Typography>
          <Box>
            {fields.filter(field => field.name === 'motivo_consulta').map(field => {
              const renderedField = renderField(field);
              if (!renderedField) return null;
              
              return (
                <Box key={field.name}>
                  {renderedField}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Antecedentes Section */}
        <Box sx={{
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 3,
          m: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 3,
            color: '#1e293b',
            pb: 1,
            borderBottom: '2px solid #f1f5f9'
          }}>
            Antecedentes
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
            gap: 3
          }}>
            {fields.filter(field => field.name.startsWith('antecedentes_')).map(field => {
              const renderedField = renderField(field);
              if (!renderedField) return null;
              
              return (
                <Box key={field.name}>
                  {renderedField}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CompanionResponsibleSection; 