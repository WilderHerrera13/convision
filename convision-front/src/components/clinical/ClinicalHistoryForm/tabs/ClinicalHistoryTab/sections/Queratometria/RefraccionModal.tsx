import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, TextField, FormControl } from '@mui/material';
import { SectionProps } from '../../types';
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

interface RefraccionModalProps extends SectionProps {
  onSave: (data: { [key: string]: string | boolean }) => void;
  onCancel: () => void;
  initialData?: { [key: string]: string | boolean };
  isEditing?: boolean;
}

const RefraccionModal: React.FC<RefraccionModalProps> = ({ 
  form, 
  serverErrors, 
  renderField, 
  onSave, 
  onCancel,
  initialData = {},
  isEditing = false
}) => {
  // Define initial data with defaults
  const initialDataWithDefaults: { [key: string]: string | boolean } = useMemo(() => ({
    // Cicloplegia fields
    cicloplegia_medicamento: '',
    cicloplegia_numero_gotas: '',
    cicloplegia_hora_aplicacion: '',
    cicloplegia_hora_examen: '',
    
    // Autorefracción fields
    autorefraccion_od_esfera: '',
    autorefraccion_od_cilindro: '',
    autorefraccion_od_eje: '',
    autorefraccion_oi_esfera: '',
    autorefraccion_oi_cilindro: '',
    autorefraccion_oi_eje: '',
    
    // Refracción fields
    refraccion_modal_od_esfera: '',
    refraccion_modal_od_cilindro: '',
    refraccion_modal_od_eje: '',
    refraccion_modal_oi_esfera: '',
    refraccion_modal_oi_cilindro: '',
    refraccion_modal_oi_eje: '',
    
    // Retinoscopía fields
    retinoscopia_od_esfera: '',
    retinoscopia_od_cilindro: '',
    retinoscopia_od_eje: '',
    retinoscopia_oi_esfera: '',
    retinoscopia_oi_cilindro: '',
    retinoscopia_oi_eje: '',
    retinoscopia_estatica: false,
    retinoscopia_dinamica: false,
    
    // Subjetivo fields (Left section)
    subjetivo_od_esfera: '',
    subjetivo_od_cilindro: '',
    subjetivo_od_eje: '',
    subjetivo_od_adicion: '',
    subjetivo_oi_esfera: '',
    subjetivo_oi_cilindro: '',
    subjetivo_oi_eje: '',
    subjetivo_oi_adicion: '',
    
    // Subjetivo fields (Right section)
    subjetivo_right_od_esfera: '',
    subjetivo_right_od_cilindro: '',
    subjetivo_right_od_eje: '',
    subjetivo_right_od_adicion: '',
    subjetivo_right_oi_esfera: '',
    subjetivo_right_oi_cilindro: '',
    subjetivo_right_oi_eje: '',
    subjetivo_right_oi_adicion: '',
    
    // Observaciones
    observaciones: '',
    ...initialData
  }), [initialData]);

  // Local state for refraccion modal data
  const [refraccionData, setRefraccionData] = useState(initialDataWithDefaults);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Check if data has changed from initial values
  const hasChanges = useMemo(() => {
    return Object.keys(initialDataWithDefaults).some(key => {
      return refraccionData[key] !== initialDataWithDefaults[key];
    });
  }, [refraccionData, initialDataWithDefaults]);

  // Reset data when initialData changes (when editing)
  useEffect(() => {
    setRefraccionData(initialDataWithDefaults);
  }, [initialDataWithDefaults]);

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setRefraccionData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    onSave(refraccionData);
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
            {isEditing ? 'Editar Refracción' : 'Refracción'}
          </Typography>
        </Box>

        {/* Content Container */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 3,
          flex: 1
        }}>
        {/* First Row: Cicloplegia + Autorefraccion */}
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          position: 'relative'
        }}>
          {/* Cicloplegia Section */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            flex: 1,
            borderRadius: 1
          }}>
            <SectionDivider title="Cicloplegia">
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: 0.5,
                  color: 'black'
                }}>
                  Medicamento
                </Typography>
                <TextField
                  size="small"
                  value={refraccionData.cicloplegia_medicamento || ''}
                  onChange={(e) => handleFieldChange('cicloplegia_medicamento', e.target.value)}
                  sx={{ 
                    width: '100%',
                    '& .MuiInputBase-root': {
                      backgroundColor: 'white',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    Número de gotas
                  </Typography>
                  <TextField
                    size="small"
                    value={refraccionData.cicloplegia_numero_gotas || ''}
                    onChange={(e) => handleFieldChange('cicloplegia_numero_gotas', e.target.value)}
                    sx={{ 
                      width: '100%',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    Hora de aplicación
                  </Typography>
                  <TextField
                    size="small"
                    value={refraccionData.cicloplegia_hora_aplicacion || ''}
                    onChange={(e) => handleFieldChange('cicloplegia_hora_aplicacion', e.target.value)}
                    sx={{ 
                      width: '100%',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    Hora de exámen
                  </Typography>
                  <TextField
                    size="small"
                    value={refraccionData.cicloplegia_hora_examen || ''}
                    onChange={(e) => handleFieldChange('cicloplegia_hora_examen', e.target.value)}
                    sx={{ 
                      width: '100%',
                      '& .MuiInputBase-root': {
                        backgroundColor: 'white',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
            </SectionDivider>
          </Box>

          {/* Vertical Division Line */}
          <Box sx={{ 
            width: '3px', 
            backgroundColor: '#e2e8f0',
            minHeight: '160px',
            borderRadius: '1px',
            alignSelf: 'stretch'
          }} />

          {/* Autorefracción Section */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            flex: 1,
            borderRadius: 1
          }}>
            <SectionDivider title="Autorefracción">
            
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Box></Box>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Esfera
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Cilindro
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Eje
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OD</Typography>
              <TextField
                size="small"
                value={refraccionData.autorefraccion_od_esfera || ''}
                onChange={(e) => handleFieldChange('autorefraccion_od_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.autorefraccion_od_cilindro || ''}
                onChange={(e) => handleFieldChange('autorefraccion_od_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.autorefraccion_od_eje || ''}
                onChange={(e) => handleFieldChange('autorefraccion_od_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* OI Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OI</Typography>
              <TextField
                size="small"
                value={refraccionData.autorefraccion_oi_esfera || ''}
                onChange={(e) => handleFieldChange('autorefraccion_oi_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.autorefraccion_oi_cilindro || ''}
                onChange={(e) => handleFieldChange('autorefraccion_oi_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.autorefraccion_oi_eje || ''}
                onChange={(e) => handleFieldChange('autorefraccion_oi_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>
            </SectionDivider>
          </Box>
        </Box>

        {/* Second Row: Refraccion + Retinoscopia */}
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          position: 'relative'
        }}>
          {/* Refracción Section */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 1,
            flex: 1
          }}>
            <SectionDivider title="Refracción">
            
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Box></Box>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Esfera
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Cilindro
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Eje
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OD</Typography>
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_od_esfera || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_od_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_od_cilindro || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_od_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_od_eje || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_od_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* OI Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OI</Typography>
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_oi_esfera || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_oi_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_oi_cilindro || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_oi_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.refraccion_modal_oi_eje || ''}
                onChange={(e) => handleFieldChange('refraccion_modal_oi_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>
            </SectionDivider>
          </Box>

          {/* Vertical Division Line */}
          <Box sx={{ 
            width: '3px', 
            backgroundColor: '#e2e8f0',
            minHeight: '160px',
            borderRadius: '1px',
            alignSelf: 'stretch'
          }} />

          {/* Retinoscopía Section */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 1,
            flex: 1
          }}>
            <SectionDivider title="Retinoscopía">
            
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Box></Box>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Esfera
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Cilindro
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Eje
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OD</Typography>
              <TextField
                size="small"
                value={refraccionData.retinoscopia_od_esfera || ''}
                onChange={(e) => handleFieldChange('retinoscopia_od_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.retinoscopia_od_cilindro || ''}
                onChange={(e) => handleFieldChange('retinoscopia_od_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.retinoscopia_od_eje || ''}
                onChange={(e) => handleFieldChange('retinoscopia_od_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* OI Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 2
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OI</Typography>
              <TextField
                size="small"
                value={refraccionData.retinoscopia_oi_esfera || ''}
                onChange={(e) => handleFieldChange('retinoscopia_oi_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.retinoscopia_oi_cilindro || ''}
                onChange={(e) => handleFieldChange('retinoscopia_oi_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.retinoscopia_oi_eje || ''}
                onChange={(e) => handleFieldChange('retinoscopia_oi_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* Checkboxes */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input 
                  type="checkbox" 
                  checked={Boolean(refraccionData.retinoscopia_estatica)}
                  onChange={(e) => handleFieldChange('retinoscopia_estatica', e.target.checked)}
                />
                <Typography sx={{ fontSize: '0.875rem' }}>Estática</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input 
                  type="checkbox" 
                  checked={Boolean(refraccionData.retinoscopia_dinamica)}
                  onChange={(e) => handleFieldChange('retinoscopia_dinamica', e.target.checked)}
                />
                <Typography sx={{ fontSize: '0.875rem' }}>Dinámica</Typography>
              </Box>  
            </Box>
            </SectionDivider>
          </Box>
        </Box>

        {/* Third Row: Subjetivo + Subjetivo */}
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          position: 'relative'
        }}>
          {/* Subjetivo Section - Left */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 1,
            flex: 1
          }}>
            <SectionDivider title="Subjetivo">
            
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Box></Box>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Esfera
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Cilindro
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Eje
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Adición
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OD</Typography>
              <TextField
                size="small"
                value={refraccionData.subjetivo_od_esfera || ''}
                onChange={(e) => handleFieldChange('subjetivo_od_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_od_cilindro || ''}
                onChange={(e) => handleFieldChange('subjetivo_od_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_od_eje || ''}
                onChange={(e) => handleFieldChange('subjetivo_od_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_od_adicion || ''}
                onChange={(e) => handleFieldChange('subjetivo_od_adicion', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* OI Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OI</Typography>
              <TextField
                size="small"
                value={refraccionData.subjetivo_oi_esfera || ''}
                onChange={(e) => handleFieldChange('subjetivo_oi_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_oi_cilindro || ''}
                onChange={(e) => handleFieldChange('subjetivo_oi_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_oi_eje || ''}
                onChange={(e) => handleFieldChange('subjetivo_oi_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_oi_adicion || ''}
                onChange={(e) => handleFieldChange('subjetivo_oi_adicion', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>
            </SectionDivider>
          </Box>

          {/* Vertical Division Line */}
          <Box sx={{ 
            width: '3px', 
            backgroundColor: '#e2e8f0',
            minHeight: '160px',
            borderRadius: '1px',
            alignSelf: 'stretch'
          }} />

          {/* Subjetivo Section - Right */}
          <Box sx={{
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 1,
            flex: 1
          }}>
            <SectionDivider title="Subjetivo">
            
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Box></Box>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Esfera
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Cilindro
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Eje
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>
                Adición
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center',
              mb: 1
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OD</Typography>
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_od_esfera || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_od_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_od_cilindro || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_od_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_od_eje || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_od_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_od_adicion || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_od_adicion', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>

            {/* OI Row */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>OI</Typography>
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_oi_esfera || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_oi_esfera', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_oi_cilindro || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_oi_cilindro', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_oi_eje || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_oi_eje', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
              <TextField
                size="small"
                value={refraccionData.subjetivo_right_oi_adicion || ''}
                onChange={(e) => handleFieldChange('subjetivo_right_oi_adicion', e.target.value)}
                sx={{ '& .MuiInputBase-root': { backgroundColor: 'white', fontSize: '0.875rem' } }}
              />
            </Box>
            </SectionDivider>
          </Box>
        </Box>

        {/* Observaciones Section */}
        <SectionDivider title="Observaciones">
          <TextField
            multiline
            rows={3}
            value={refraccionData.observaciones || ''}
            onChange={(e) => handleFieldChange('observaciones', e.target.value)}
            sx={{ 
              width: '100%',
              '& .MuiInputBase-root': {
                backgroundColor: 'white',
                border: '1px solid #e0e0e0'
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
                      backgroundColor: 'white',
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

export default RefraccionModal; 