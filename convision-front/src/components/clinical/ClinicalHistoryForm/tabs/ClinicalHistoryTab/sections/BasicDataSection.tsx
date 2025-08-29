import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

// Custom date picker component for future dates only using HTML5 date input
const FutureDatePicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: boolean;
  helperText?: string;
}> = ({ value, onChange, label, error, helperText }) => {
  // Convert DD/MM/YYYY to YYYY-MM-DD for HTML5 date input
  const convertToDateInputValue = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy === '') return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY
  const convertFromDateInputValue = (yyyymmdd: string): string => {
    if (!yyyymmdd || yyyymmdd === '') return '';
    const parts = yyyymmdd.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    return '';
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const ddmmyyyy = convertFromDateInputValue(newValue);
    onChange(ddmmyyyy);
  };

  // Set minimum date to today in YYYY-MM-DD format
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <Box>
      <Typography variant="body2" sx={{ 
        mb: 0.5, 
        fontSize: '0.875rem', 
        fontWeight: 500,
        color: error ? '#d32f2f' : 'rgba(0, 0, 0, 0.6)'
      }}>
        {label}
      </Typography>
      <TextField
        type="date"
        value={convertToDateInputValue(value)}
        onChange={handleDateChange}
        size="small"
        fullWidth
        error={error}
        helperText={helperText}
        inputProps={{
          min: minDate,
        }}
        InputProps={{}}
        sx={{
          bgcolor: 'white',
          '& .MuiInputBase-root': {
            height: '40px', // Match the height of other form fields
          }
        }}
      />
    </Box>
  );
};

const BasicDataSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const fields: FieldDefinition[] = [
    { 
      name: "patient_id", 
      label: "ID del Paciente", 
      type: "text", 
      required: true
    },
    { 
      name: "fecha_consulta", 
      label: "Fecha de Consulta", 
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

  // Get form values
  const formValues = form.watch();

  // Set default current date for fecha_consulta
  React.useEffect(() => {
    const currentFecha = form.getValues('fecha_consulta' as any);
    if (!currentFecha) {
      // Set today's date as default in DD/MM/YYYY format
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      form.setValue('fecha_consulta' as any, formattedDate);
    }
  }, [form]);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Main content section - 3/4 width */}
      <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Fecha field - own row with same width as Nombre */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1, maxWidth: '33.333%' }}>
            <FutureDatePicker
              value={(formValues as any).fecha_consulta || ''}
              onChange={(value) => form.setValue('fecha_consulta' as any, value)}
              label="Fecha"
              error={!!(serverErrors as any)?.fecha_consulta}
              helperText={Array.isArray((serverErrors as any)?.fecha_consulta) ? (serverErrors as any).fecha_consulta[0] : (serverErrors as any)?.fecha_consulta}
            />
          </Box>
        </Box>

        {/* First row - Nombre, Documento, Edad */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Nombre
            </Typography>
            <TextField
              value={formValues.name || ''}
              onChange={(e) => form.setValue('name', e.target.value)}
              size="small"
              fullWidth
              placeholder="Nombre completo del paciente"
              error={!!serverErrors?.name}
              helperText={serverErrors?.name}
              sx={{ bgcolor: 'white' }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Documento
            </Typography>
            <TextField
              value={formValues.document || ''}
              onChange={(e) => form.setValue('document', e.target.value)}
              size="small"
              fullWidth
              placeholder="12345678"
              error={!!serverErrors?.document}
              helperText={serverErrors?.document}
              sx={{ bgcolor: 'white' }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Edad
            </Typography>
            <TextField
              value={formValues.edad || ''}
              onChange={(e) => form.setValue('edad', e.target.value)}
              size="small"
              fullWidth
              placeholder="25"
              sx={{ bgcolor: 'white' }}
            />
          </Box>
        </Box>

        {/* Second row - Afiliación, Salud, Ocupación */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Afiliación
            </Typography>
            <TextField
              value={formValues.afiliacion || ''}
              onChange={(e) => form.setValue('afiliacion', e.target.value)}
              size="small"
              fullWidth
              placeholder="EPS, ARL, etc."
              sx={{ bgcolor: 'white' }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Salud
            </Typography>
            <TextField
              value={formValues.salud || ''}
              onChange={(e) => form.setValue('salud', e.target.value)}
              size="small"
              fullWidth
              placeholder="Estado de salud"
              sx={{ bgcolor: 'white' }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Ocupación
            </Typography>
            <TextField
              value={formValues.ocupacion || ''}
              onChange={(e) => form.setValue('ocupacion', e.target.value)}
              size="small"
              fullWidth
              placeholder="Profesión u ocupación"
              sx={{ bgcolor: 'white' }}
            />
          </Box>
        </Box>
        
        {/* Hidden patient_id field */}
        <TextField
          value={formValues.patient_id || ''}
          onChange={(e) => form.setValue('patient_id', parseInt(e.target.value) || 0)}
          type="hidden"
          sx={{ display: 'none' }}
        />
      </Box>

      {/* Photo section - 1/4 width */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
          Foto del Paciente
        </Typography>
        <Box sx={{
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: 2,
          textAlign: 'center',
          bgcolor: '#f9fafb',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#9ca3af',
            bgcolor: '#f3f4f6'
          }
        }}>
          {(formValues as any).photo ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              <img
                src={(formValues as any).photo}
                alt="Foto del paciente"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
            </Box>
          ) : (
            <>
              <Box sx={{ fontSize: '48px', color: '#9ca3af', mb: 1 }}>📷</Box>
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center' }}>
                Haz clic para subir una foto
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5 }}>
                JPG, PNG hasta 5MB
              </Typography>
            </>
          )}
        </Box>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                form.setValue('photo' as any, event.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
          style={{ display: 'none' }}
          id="photo-upload"
        />
        <label htmlFor="photo-upload" style={{ cursor: 'pointer' }}>
          <Box component="span" sx={{
            display: 'inline-block',
            width: '100%',
            padding: 1,
            textAlign: 'center',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            bgcolor: 'white',
            fontSize: '0.875rem',
            '&:hover': {
              bgcolor: '#f9fafb'
            }
          }}>
            Seleccionar archivo
          </Box>
        </label>
      </Box>
    </Box>
  );
};

export default BasicDataSection; 