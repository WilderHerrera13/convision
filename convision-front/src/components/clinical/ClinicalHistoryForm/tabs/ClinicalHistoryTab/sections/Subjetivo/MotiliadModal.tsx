import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { SectionProps } from '../../types';
import UnsavedChangesWarning from '../../../../shared/UnsavedChangesWarning';

// Section Divider Component (extracted from OftalmoscopiaSection)
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

interface MotiliadModalProps extends Omit<SectionProps, 'renderField'> {
  onSave: (data: { [key: string]: string | boolean }) => void;
  onCancel: () => void;
  initialData: { [key: string]: string | boolean };
  isEditing: boolean;
}

const MotiliadModal: React.FC<MotiliadModalProps> = ({
  form,
  serverErrors,
  onSave,
  onCancel,
  initialData,
  isEditing
}) => {
  // Define initial data with defaults
  const initialDataWithDefaults: { [key: string]: string | boolean } = useMemo(() => ({
    // Dominancia fields
    ojo_dominante: 'Derecho',
    mano_dominante: 'Derecha',
    
    // Kappa
    kappa_od: 'Positivo',
    kappa_oi: 'Positivo',
    
    // Ducciones
    ducciones_od: 'Suaves, completas, continuas',
    ducciones_oi: 'Suaves, completas, continuas',
    
    // Hirschberg
    hirschberg: 'Centrado',
    
    // Versiones - all OK buttons (18 total)
    versiones_1: 'OK', versiones_2: 'OK', versiones_3: 'OK',
    versiones_4: 'OK', versiones_5: 'OK', versiones_6: 'OK',
    versiones_7: 'OK', versiones_8: 'OK', versiones_9: 'OK',
    versiones_10: 'OK', versiones_11: 'OK', versiones_12: 'OK',
    versiones_13: 'OK', versiones_14: 'OK', versiones_15: 'OK',
    versiones_16: 'OK', versiones_17: 'OK', versiones_18: 'OK',
    
    // Test Usado
    test_usado: 'Cover Test',
    
    // RFP/RFN fields
    rfp_vl: '',
    rfp_vc: '',
    rfn_vl: '',
    rfn_vc: '',
    
    // VL
    vl: 'Ortho',
    vl_con_correccion: 'Ortho',
    
    // CMS fields
    cms_40_sin_correccion: 'Ortho',
    cms_40_con_correccion: 'Ortho',
    cms_20_sin_correccion: 'Ortho',
    cms_20_con_correccion: 'Ortho',
    
    // PPC
    ppc_objeto_real: '',
    ppc_luz: '',
    ppc_filtro_rojo: '',
    
    // Saltos Vergenciales
    saltos_vergenciales_vc: '',
    saltos_vergenciales_vl: '',
    
    // LAG fields
    lag_acomodacion_od: '',
    lag_flexibilidad_od: '',
    lag_arp_od: '',
    lag_subjetiva_od: '',
    lag_amplitud_od: '',
    
    lag_acomodacion_oi: '',
    lag_flexibilidad_oi: '',
    lag_arn_oi: '',
    lag_objetiva_oi: '',
    lag_amplitud_oi: '',
    
    // AO
    lag_acomodacion_ao: '',
    lag_flexibilidad_ao: '',
    lag_amplitud_aoa: '',
    
    // Observaciones
    observaciones: '',
    
    ...initialData
  }), [initialData]);

  // Local state for modal data
  const [motiliadData, setMotiliadData] = useState(initialDataWithDefaults);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Check if data has changed from initial values
  const hasChanges = useMemo(() => {
    return Object.keys(initialDataWithDefaults).some(key => {
      return motiliadData[key] !== initialDataWithDefaults[key];
    });
  }, [motiliadData, initialDataWithDefaults]);

  // Reset data when initialData changes (when editing)
  useEffect(() => {
    setMotiliadData(initialDataWithDefaults);
  }, [initialDataWithDefaults]);

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setMotiliadData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    onSave(motiliadData);
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
          Motilidad ocular
        </Typography>
      </Box>

      {/* Main Content Area - Row Layout */}
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
        {/* Row 1: Ojo y Mano Dominante */}
        <SectionDivider title="Ojo y Mano Dominante">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* First row: Ojo Dominante and Mano Dominante */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  mb: 0.5, 
                  fontWeight: 500,
                  color: 'black'
                }}>
                  Ojo Dominante
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={motiliadData.ojo_dominante || 'Derecho'}
                    onChange={(e) => handleFieldChange('ojo_dominante', e.target.value)}
                    displayEmpty
                    MenuProps={{
                      sx: { zIndex: 10001 },
                      PaperProps: {
                        sx: {
                          maxHeight: 200
                        }
                      }
                    }}
                    sx={{ 
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  >
                    <MenuItem value="Derecho">Derecho</MenuItem>
                    <MenuItem value="Izquierdo">Izquierdo</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  mb: 0.5, 
                  fontWeight: 500,
                  color: 'black'
                }}>
                  Mano Dominante
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={motiliadData.mano_dominante || 'Derecha'}
                    onChange={(e) => handleFieldChange('mano_dominante', e.target.value)}
                    displayEmpty
                    MenuProps={{
                      sx: { zIndex: 10001 },
                      PaperProps: {
                        sx: {
                          maxHeight: 200
                        }
                      }
                    }}
                    sx={{ 
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  >
                    <MenuItem value="Derecha">Derecha</MenuItem>
                    <MenuItem value="Izquierda">Izquierda</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Second row: two internal columns Kappa / Ducciones */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {/* Kappa column */}
              <Box>
                <Typography sx={{ fontSize: '0.875rem', mb: 0.5, fontWeight: 500, color: 'black' }}>Kappa</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', minWidth: '30px' }}>OD</Typography>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={motiliadData.kappa_od || 'Positivo'}
                      onChange={(e) => handleFieldChange('kappa_od', e.target.value)}
                      displayEmpty
                      MenuProps={{
                        sx: { zIndex: 10001 },
                        PaperProps: {
                          sx: {
                            maxHeight: 200
                          }
                        }
                      }}
                      sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                    >
                      <MenuItem value="Positivo">Positivo</MenuItem>
                      <MenuItem value="Negativo">Negativo</MenuItem>
                      <MenuItem value="Cero">Cero</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography sx={{ fontSize: '0.75rem', minWidth: '30px' }}>OI</Typography>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={motiliadData.kappa_oi || 'Positivo'}
                      onChange={(e) => handleFieldChange('kappa_oi', e.target.value)}
                      displayEmpty
                      MenuProps={{
                        sx: { zIndex: 10001 },
                        PaperProps: {
                          sx: {
                            maxHeight: 200
                          }
                        }
                      }}
                      sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                    >
                      <MenuItem value="Positivo">Positivo</MenuItem>
                      <MenuItem value="Negativo">Negativo</MenuItem>
                      <MenuItem value="Cero">Cero</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Ducciones column */}
              <Box>
                <Typography sx={{ fontSize: '0.875rem', mb: 0.5, fontWeight: 500, color: 'black' }}>Ducciones</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', minWidth: '30px' }}>OD</Typography>
                  <TextField
                    size="small"
                    value={motiliadData.ducciones_od}
                    onChange={(e) => handleFieldChange('ducciones_od', e.target.value)}
                    sx={{ backgroundColor: 'white', flex: 1, '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                  />
                  <Typography sx={{ fontSize: '0.75rem', minWidth: '30px' }}>OI</Typography>
                  <TextField
                    size="small"
                    value={motiliadData.ducciones_oi}
                    onChange={(e) => handleFieldChange('ducciones_oi', e.target.value)}
                    sx={{ backgroundColor: 'white', flex: 1, '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Third row: Hirschberg (moved here) */}
            <Box>
              <Typography sx={{ fontSize: '0.875rem', mb: 0.5, fontWeight: 500, color: 'black' }}>Hirschberg</Typography>
              <TextField
                size="small"
                value={motiliadData.hirschberg}
                onChange={(e) => handleFieldChange('hirschberg', e.target.value)}
                sx={{ backgroundColor: 'white', width: '100%', '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
              />
            </Box>
          </Box>
        </SectionDivider>

        {/* Row 2: Versiones */}
        <SectionDivider title="Versiones">
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {/* First Versiones column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Top row: two OK inputs - centered */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_1 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_1', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                <TextField
                  size="small"
                  value={motiliadData.versiones_2 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_2', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>

              {/* Middle row: OK | bar | OK */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_3 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_3', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                {/* Horizontal bar with two vertical ticks */}
                <Box sx={{ position: 'relative', height: '20px' }}>
                  <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', bgcolor: '#777', transform: 'translateY(-50%)' }} />
                  <Box sx={{ position: 'absolute', top: '2px', left: '33%', width: '2px', bottom: '2px', bgcolor: '#111' }} />
                  <Box sx={{ position: 'absolute', top: '2px', left: '66%', width: '2px', bottom: '2px', bgcolor: '#111' }} />
                </Box>
                <TextField
                  size="small"
                  value={motiliadData.versiones_4 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_4', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>

              {/* Bottom row: two OK inputs - centered */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_5 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_5', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                <TextField
                  size="small"
                  value={motiliadData.versiones_6 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_6', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Second Versiones column - exact same content */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Top row: two OK inputs - centered */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_7 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_7', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                <TextField
                  size="small"
                  value={motiliadData.versiones_8 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_8', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>

              {/* Middle row: OK | bar | OK */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_9 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_9', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                {/* Horizontal bar with two vertical ticks */}
                <Box sx={{ position: 'relative', height: '20px' }}>
                  <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', bgcolor: '#777', transform: 'translateY(-50%)' }} />
                  <Box sx={{ position: 'absolute', top: '2px', left: '33%', width: '2px', bottom: '2px', bgcolor: '#111' }} />
                  <Box sx={{ position: 'absolute', top: '2px', left: '66%', width: '2px', bottom: '2px', bgcolor: '#111' }} />
                </Box>
                <TextField
                  size="small"
                  value={motiliadData.versiones_10 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_10', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>

              {/* Bottom row: two OK inputs - centered */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <TextField
                  size="small"
                  value={motiliadData.versiones_11 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_11', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
                <TextField
                  size="small"
                  value={motiliadData.versiones_12 || 'OK'}
                  onChange={(e) => handleFieldChange('versiones_12', e.target.value)}
                  sx={{
                    width: '115px', 
                    height: '32px',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: 'white',
                      border: '1px solid #2B5797',
                      borderRadius: '4px'
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>
        </SectionDivider>

        {/* Row 3: Evaluaciones */}
        <SectionDivider title="Evaluaciones">
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 3 }}>
            {/* First Column (3/4 width) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Row 1: Test Usado */}
              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  mb: 0.5, 
                  fontWeight: 500,
                  color: 'black'
                }}>
                  Test Usado
                </Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={motiliadData.test_usado || 'Cover Test'}
                    onChange={(e) => handleFieldChange('test_usado', e.target.value)}
                    displayEmpty
                    MenuProps={{
                      sx: { zIndex: 10001 },
                      PaperProps: {
                        sx: {
                          maxHeight: 200
                        }
                      }
                    }}
                    sx={{ 
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  >
                    <MenuItem value="Cover Test">Cover Test</MenuItem>
                    <MenuItem value="Krimsky">Krimsky</MenuItem>
                    <MenuItem value="White">White</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Row 2: Sin corrección and Con corrección columns */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 2.5fr', gap: 1, alignItems: 'center' }}>
                {/* Column 1: Labels */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ height: '32px' }} /> {/* Empty space for title row */}
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>VL</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>40 CMS</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>20 CMS</Typography>
                </Box>

                {/* Column 2: Sin corrección */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', textAlign: 'center', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin corrección</Typography>
                  <TextField
                    size="small"
                    value={motiliadData.vl}
                    onChange={(e) => handleFieldChange('vl', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    value={motiliadData.cms_40_sin_correccion}
                    onChange={(e) => handleFieldChange('cms_40_sin_correccion', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    value={motiliadData.cms_20_sin_correccion}
                    onChange={(e) => handleFieldChange('cms_20_sin_correccion', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                </Box>

                {/* Column 3: Con corrección */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', textAlign: 'center', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Con corrección</Typography>
                  <TextField
                    size="small"
                    value={motiliadData.vl_con_correccion}
                    onChange={(e) => handleFieldChange('vl_con_correccion', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    value={motiliadData.cms_40_con_correccion}
                    onChange={(e) => handleFieldChange('cms_40_con_correccion', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    value={motiliadData.cms_20_con_correccion}
                    onChange={(e) => handleFieldChange('cms_20_con_correccion', e.target.value)}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        height: '32px'
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Row 3: PPC */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 5fr', gap: 1, alignItems: 'center' }}>
                {/* Column 1: PPC Label (1/5 width) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                  <Box sx={{ height: '32px' }} /> {/* Empty space for title row */}
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PPC</Typography>
                </Box>
                
                {/* Column 2: Objeto Real, Luz, Filtro Rojo (4/5 width) */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}> 
                  {/* Objeto Real */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>Objeto Real</Typography>
                    <TextField
                      size="small"
                      value={motiliadData.ppc_objeto_real}
                      onChange={(e) => handleFieldChange('ppc_objeto_real', e.target.value)}
                      sx={{ 
                        backgroundColor: 'white', 
                        width: '100%',
                        '& .MuiInputBase-root': {
                          fontSize: '0.875rem'
                        }
                      }}
                    />
                  </Box>

                  {/* Luz */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>Luz</Typography>
                    <TextField
                      size="small"
                      value={motiliadData.ppc_luz}
                      onChange={(e) => handleFieldChange('ppc_luz', e.target.value)}
                      sx={{ 
                        backgroundColor: 'white', 
                        width: '100%',
                        '& .MuiInputBase-root': {
                          fontSize: '0.875rem'
                        }
                      }}
                    />
                  </Box>

                  {/* Filtro Rojo */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', mb: 0.5 }}>Filtro Rojo</Typography>
                    <TextField
                      size="small"
                      value={motiliadData.ppc_filtro_rojo}
                      onChange={(e) => handleFieldChange('ppc_filtro_rojo', e.target.value)}
                      sx={{ 
                        backgroundColor: 'white', 
                        width: '100%',
                        '& .MuiInputBase-root': {
                          fontSize: '0.875rem'
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Second Column (1/4 width) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Row 1: RFP */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', textAlign: 'center' }}>RFP</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="VL"
                    value={motiliadData.rfp_vl}
                    onChange={(e) => handleFieldChange('rfp_vl', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder="VC"
                    value={motiliadData.rfp_vc}
                    onChange={(e) => handleFieldChange('rfp_vc', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Row 2: RFN */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', textAlign: 'center' }}>RFN</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="VL"
                    value={motiliadData.rfn_vl}
                    onChange={(e) => handleFieldChange('rfn_vl', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder="VC"
                    value={motiliadData.rfn_vc}
                    onChange={(e) => handleFieldChange('rfn_vc', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Row 3: Saltos Vergenciales */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black', textAlign: 'center' }}>Saltos Vergenciales</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="VL"
                    value={motiliadData.saltos_vergenciales_vl}
                    onChange={(e) => handleFieldChange('saltos_vergenciales_vl', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder="VC"
                    value={motiliadData.saltos_vergenciales_vc}
                    onChange={(e) => handleFieldChange('saltos_vergenciales_vc', e.target.value)}
                    sx={{ 
                      backgroundColor: 'white',
                      flex: 1,
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </SectionDivider>

        {/* Row 4: LAG */}
        <SectionDivider title="LAG">

          <Box sx={{ display: 'grid', gridTemplateColumns: '8fr 3fr', gap: 1, alignItems: 'start' }}>
            {/* Column 1: LAG Title (1/7 width) */}
            
            {/* Column 2: 4/7 width, divided into 4 internal columns and 4 rows */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr', gridTemplateRows: 'auto auto auto auto', gap: 1 }}>
              {/* Row 1 (Headers) */}
              <Box sx={{ gridColumn: '1 / span 1', gridRow: '1 / span 1' }} /> {/* Empty spacer */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', gridColumn: '2 / span 1', gridRow: '1 / span 1' }}>Acomodación</Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', gridColumn: '3 / span 1', gridRow: '1 / span 1' }}>Flexibilidad</Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', gridColumn: '4 / span 1', gridRow: '1 / span 1' }}>ARP</Typography>

              {/* Row 2 (OD) */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '1 / span 1', gridRow: '2 / span 1' }}>OD</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_acomodacion_od}
                onChange={(e) => handleFieldChange('lag_acomodacion_od', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '2 / span 1', gridRow: '2 / span 1' }}
              />
              <TextField
                size="small"
                value={motiliadData.lag_flexibilidad_od}
                onChange={(e) => handleFieldChange('lag_flexibilidad_od', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '3 / span 1', gridRow: '2 / span 1' }}
              />
              <TextField
                size="small"
                value={motiliadData.lag_arp_od}
                onChange={(e) => handleFieldChange('lag_arp_od', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '4 / span 1', gridRow: '2 / span 1' }}
              />

              {/* Row 3 (OI) */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '1 / span 1', gridRow: '3 / span 1' }}>OI</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_acomodacion_oi}
                onChange={(e) => handleFieldChange('lag_acomodacion_oi', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '2 / span 1', gridRow: '3 / span 1' }}
              />
              <TextField
                size="small"
                value={motiliadData.lag_flexibilidad_oi}
                onChange={(e) => handleFieldChange('lag_flexibilidad_oi', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '3 / span 1', gridRow: '3 / span 1' }}
              />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: '4 / span 1', gridRow: '3 / span 1' }}>ARN</Typography>

              {/* Row 4 (AO) */}
              <Box sx={{ gridColumn: '1 / span 1', gridRow: '4 / span 1' }} /> {/* Empty spacer */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1, gridColumn: '2 / span 1', gridRow: '4 / span 1' }}>AO</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_acomodacion_ao}
                onChange={(e) => handleFieldChange('lag_acomodacion_ao', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '3 / span 1', gridRow: '4 / span 1' }}
              />
              <TextField
                size="small"
                value={motiliadData.lag_flexibilidad_ao}
                onChange={(e) => handleFieldChange('lag_flexibilidad_ao', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '4 / span 1', gridRow: '4 / span 1' }}
              />
            </Box>

            {/* Column 3: 2/7 width, divided into 2 internal columns and 4 rows */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gridTemplateRows: 'auto auto auto auto', gap: 1 }}>
              {/* Row 1 (Header) */}
              <Box sx={{ gridColumn: '1 / span 1', gridRow: '1 / span 1' }} /> {/* Empty spacer */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', gridColumn: '2 / span 1', gridRow: '1 / span 1' }}>Amplitud</Typography>

              {/* Row 2 (Subjetiva/OD Amplitud) */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1, gridColumn: '1 / span 1', gridRow: '2 / span 1' }}>Subjetiva</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_subjetiva_od}
                onChange={(e) => handleFieldChange('lag_subjetiva_od', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '2 / span 1', gridRow: '2 / span 1' }}
              />

              {/* Row 3 (Objetiva/OI Amplitud) */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1, gridColumn: '1 / span 1', gridRow: '3 / span 1' }}>Objetiva</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_amplitud_oi}
                onChange={(e) => handleFieldChange('lag_amplitud_oi', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '2 / span 1', gridRow: '3 / span 1' }}
              />

              {/* Row 4 (AØA/AØA Amplitud) */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1, gridColumn: '1 / span 1', gridRow: '4 / span 1' }}>A Ø A</Typography>
              <TextField
                size="small"
                value={motiliadData.lag_amplitud_aoa}
                onChange={(e) => handleFieldChange('lag_amplitud_aoa', e.target.value)}
                sx={{ backgroundColor: 'white', '& .MuiInputBase-root': { fontSize: '0.75rem' }, gridColumn: '2 / span 1', gridRow: '4 / span 1' }}
              />
            </Box>
          </Box>
        </SectionDivider>

        {/* Row 5: Observaciones */}
        <SectionDivider title="Observaciones">
          
          <TextField
            multiline
            rows={6}
            value={motiliadData.observaciones}
            onChange={(e) => handleFieldChange('observaciones', e.target.value)}
            sx={{ 
              width: '100%',
              '& .MuiInputBase-root': {
                backgroundColor: 'white',
                fontSize: '0.875rem',
                alignItems: 'flex-start'
              }
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

export default MotiliadModal;