import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, TextField, FormControl, Select, MenuItem } from '@mui/material';
import { Add, Remove, TouchApp } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import LensRecommendationModal from './LensRecommendationModal';

interface DiagnosticoCIE {
  id: string;
  ojo: string;
  cie10: string;
  diagnostico: string;
  principal: string;
}

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

  // Set minimum date to tomorrow in YYYY-MM-DD format
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Box>
      <Typography variant="body2" sx={{ 
        mb: 0.5, 
        fontSize: '0.875rem', 
        fontWeight: 500,
        color: error ? '#d32f2f' : 'rgba(0, 0, 0, 0.6)'
      }}>
        {label}
        <span style={{ color: '#d32f2f', marginLeft: '4px' }}>*</span>
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

const DiagnosticoSection: React.FC<SectionProps> = ({ form, serverErrors }) => {
  // Initialize with three dummy records
  const [diagnosticosCIE, setDiagnosticosCIE] = useState<DiagnosticoCIE[]>([
    {
      id: 'cie_1',
      ojo: 'OD',
      cie10: 'H52.1',
      diagnostico: 'Astigmatismo irregular',
      principal: 'Sí'
    },
    {
      id: 'cie_2',
      ojo: 'OI',
      cie10: 'H52.0',
      diagnostico: 'Hipermetropía',
      principal: 'No'
    },
    {
      id: 'cie_3',
      ojo: 'AO',
      cie10: 'H52.2',
      diagnostico: 'Astigmatismo',
      principal: 'No'
    }
  ]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Lens recommendation modal state
  const [showLensModal, setShowLensModal] = useState(false);
  const [selectedLens, setSelectedLens] = useState<any>(null);

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
    setShowLensModal(true);
  };

  const handleCloseLensModal = () => {
    setShowLensModal(false);
  };

  const handleSelectLens = (lens: any) => {
    setSelectedLens(lens);
    // Update the form with the selected lens information
    form.setValue('recomendacion', lens.descripcion);
  };

  // Set default values for Profesional, Tipo diagnostico, and Proximo control visual fields
  React.useEffect(() => {
    const currentProfesional = form.getValues('profesional');
    if (!currentProfesional) {
      form.setValue('profesional', 'paula_valderrama');
    }
    
    const currentTipoDiagnostico = form.getValues('tipo_diagnostico');
    if (!currentTipoDiagnostico) {
      form.setValue('tipo_diagnostico', 'IMPRESION_DIAGNOSTICA');
    }
    
    const currentProximoControl = form.getValues('proximo_control_visual');
    if (!currentProximoControl) {
      // Set tomorrow's date as default in DD/MM/YYYY format (future dates only)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = `${tomorrow.getDate().toString().padStart(2, '0')}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()}`;
      form.setValue('proximo_control_visual', formattedDate);
    }
  }, [form]);

  const handleAddDiagnosticoCIE = () => {
    // Placeholder for adding CIE-10 diagnostic
    const newDiagnostico: DiagnosticoCIE = {
      id: `cie_${Date.now()}`,
      ojo: 'OD',
      cie10: 'H52.0',
      diagnostico: 'Nuevo diagnóstico',
      principal: 'No'
    };
    setDiagnosticosCIE([...diagnosticosCIE, newDiagnostico]);
  };

  const handleRemoveSelectedDiagnosticos = () => {
    setDiagnosticosCIE(diagnosticosCIE.filter(d => !selectedRows.includes(d.id)));
    setSelectedRows([]);
  };

  const handleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === diagnosticosCIE.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(diagnosticosCIE.map(d => d.id));
    }
  };

  // Get form values
  const formValues = form.watch();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ROW 2 - Recomendacion, Tipo diagnostico and N dispositivos medicos in 2x2 layout */}
      <Box sx={{ mb: 3 }}>
        {/* First sub-row: Recomendacion with button */}
        <Box sx={{ 
          display: 'flex',
          gap: 2,
          mb: 2,
          width: '50%'
        }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Recomendación
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formValues.recomendacion || ''}
                  onChange={(e) => form.setValue('recomendacion', e.target.value)}
                >
                  {recomendacionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <IconButton
              onClick={handleRecomendacionButton}
              sx={{
                backgroundColor: '#3b82f6',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#2563eb'
                },
                width: 40,
                height: 40,
                borderRadius: 1,
                alignSelf: 'flex-end'
              }}
            >
              <TouchApp />
            </IconButton>
          </Box>
        </Box>
        
        {/* Second sub-row: Tipo diagnostico and N dispositivos medicos */}
        <Box sx={{ 
          display: 'flex',
          gap: 2
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Tipo diagnóstico
            </Typography>
            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
              <Select
                value={formValues.tipo_diagnostico || ''}
                onChange={(e) => form.setValue('tipo_diagnostico', e.target.value)}
              >
                {tipoDiagnosticoOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              N° dispositivos médicos
            </Typography>
            <TextField
              value={formValues.n_dispositivos_medicos || ''}
              onChange={(e) => form.setValue('n_dispositivos_medicos', e.target.value)}
              size="small"
              fullWidth
              placeholder="0"
              sx={{ bgcolor: 'white' }}
            />
          </Box>
        </Box>
      </Box>

      {/* ROW 3 - Diagnosticos CIE-10 table */}
      <Box sx={{ mb: 3 }}>
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
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: '#45a049'
                }
              }}
            >
              <Add sx={{ fontSize: '1.2rem' }} />
            </IconButton>
            
            <IconButton
              onClick={handleRemoveSelectedDiagnosticos}
              disabled={selectedRows.length === 0}
              sx={{
                backgroundColor: '#f44336',
                color: 'white',
                width: 32,
                height: 32,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: '#d32f2f'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#ccc',
                  color: '#999'
                }
              }}
            >
              <Remove sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </Box>
        </Box>

        {/* Table container for CIE-10 diagnostics */}
        <TableContainer component={Paper} sx={{ 
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          minHeight: '120px'
        }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < diagnosticosCIE.length}
                    checked={diagnosticosCIE.length > 0 && selectedRows.length === diagnosticosCIE.length}
                    onChange={handleSelectAll}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>OJO</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>CIE10</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Diagnóstico</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Principal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diagnosticosCIE.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2, color: '#666' }}>
                    No hay diagnósticos CIE-10 registrados
                  </TableCell>
                </TableRow>
              ) : (
                diagnosticosCIE.map((diagnostico) => (
                  <TableRow 
                    key={diagnostico.id}
                    hover
                    selected={selectedRows.includes(diagnostico.id)}
                    onClick={() => handleRowSelection(diagnostico.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.includes(diagnostico.id)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{diagnostico.ojo}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{diagnostico.cie10}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{diagnostico.diagnostico}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', textAlign: 'center' }}>
                      {diagnostico.principal}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ROW 4 - Profesional and Proximo control visual in 2x2 layout */}
      <Box sx={{ 
        display: 'flex',
        gap: 2
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
            Profesional
          </Typography>
          <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
            <Select
              value={formValues.profesional || ''}
              onChange={(e) => form.setValue('profesional', e.target.value)}
            >
              {profesionalOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: 1 , alignContent: 'end'}}>
          <FutureDatePicker
            value={form.watch('proximo_control_visual') || ''}
            onChange={(value) => form.setValue('proximo_control_visual', value)}
            label="Próximo control visual"
            error={!!serverErrors['proximo_control_visual']}
            helperText={serverErrors['proximo_control_visual']?.[0]}
          />
        </Box>
      </Box>

      {/* Lens Recommendation Modal */}
      {showLensModal && (
        <Box 
          sx={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            p: 2
          }}
        >
          <Box 
            sx={{ 
              backgroundColor: 'white',
              borderRadius: 2,
              maxWidth: 1200,
              maxHeight: '90vh',
              overflow: 'auto',
              width: '100%',
              mx: 'auto'
            }}
          >
            <LensRecommendationModal
              onClose={handleCloseLensModal}
              onSelectLens={handleSelectLens}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DiagnosticoSection;
