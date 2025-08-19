import React from 'react';
import { Box } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

const BasicDataSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const fields: FieldDefinition[] = [
    { 
      name: "patient_id", 
      label: "ID del Paciente", 
      type: "text", 
      required: true
    },
    { 
      name: "name", 
      label: "Nombre", 
      type: "text", 
      required: true,
      placeholder: "Nombre completo del paciente"
    },
    { 
      name: "document", 
      label: "Documento", 
      type: "text", 
      required: true,
      placeholder: "12345678"
    },
    { 
      name: "edad", 
      label: "Edad", 
      type: "text",
      placeholder: "25"
    },
    { 
      name: "afiliacion", 
      label: "Afiliación", 
      type: "text",
      placeholder: "EPS, ARL, etc."
    },
    { 
      name: "salud", 
      label: "Salud", 
      type: "text",
      placeholder: "Estado de salud"
    },
    { 
      name: "ocupacion", 
      label: "Ocupación", 
      type: "text",
      placeholder: "Profesión u ocupación"
    }
  ];

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
      gap: 2
    }}>
      {fields.filter(field => field.name !== 'patient_id').map(field => {
        const renderedField = renderField(field);
        if (!renderedField) return null;
        
        return (
          <Box key={field.name}>
            {renderedField}
          </Box>
        );
      })}
      
      {/* Render patient_id field separately as hidden */}
      {fields.find(field => field.name === 'patient_id') && renderField(fields.find(field => field.name === 'patient_id')!)}
    </Box>
  );
};

export default BasicDataSection; 