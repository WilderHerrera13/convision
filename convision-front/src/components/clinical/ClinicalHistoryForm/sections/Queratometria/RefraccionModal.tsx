import React, { useState } from 'react';
import { Box, Typography, Button, TextField, FormControl } from '@mui/material';
import { SectionProps } from '../../types';

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
  // Local state for refraccion modal data
  const [refraccionData, setRefraccionData] = useState(() => {
    const initialDataWithDefaults: { [key: string]: string | boolean } = {
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
      
      // Subjetivo fields
      subjetivo_od_esfera: '',
      subjetivo_od_cilindro: '',
      subjetivo_od_eje: '',
      subjetivo_od_adicion: '',
      subjetivo_oi_esfera: '',
      subjetivo_oi_cilindro: '',
      subjetivo_oi_eje: '',
      subjetivo_oi_adicion: '',
      
      // Observaciones
      observaciones: '',
      ...initialData
    };
    
    return initialDataWithDefaults;
  });

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setRefraccionData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    onSave(refraccionData);
  };

  const handleLoadData = () => {
    // For now, just close modal - will implement loading logic later
    onCancel();
  };

  return (
    <Box sx={{ 
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 2,
      color: 'black',
      minHeight: '80vh'
    }}>
      {/* Header */}
      <Typography variant="h5" sx={{ 
        fontWeight: 600, 
        textAlign: 'center',
        color: 'black',
        mb: 1
      }}>
        {isEditing ? 'Editar Refracción' : 'Refracción'}
      </Typography>

      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex',
        gap: 3,
        flex: 1
      }}>
        {/* Left Column */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          {/* Cicloplegia Section */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Cicloplegia
            </Typography>
            
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
          </Box>

          {/* Refracción Section */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Refracción
            </Typography>
            
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
          </Box>

          {/* Subjetivo Section - Left */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Subjetivo
            </Typography>
            
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
          </Box>
        </Box>

        {/* Right Column */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          {/* Autorefracción Section */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Autorefracción
            </Typography>
            
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
          </Box>

          {/* Retinoscopía Section */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Retinoscopía
            </Typography>
            
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
          </Box>

          {/* Subjetivo Section - Right */}
          <Box sx={{
            border: '1px solid #2B5797',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'white'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#2B5797',
              mb: 2,
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Subjetivo
            </Typography>
            
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
          </Box>
        </Box>
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
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        display: 'flex',
        gap: 2,
        justifyContent: 'space-between',
        mt: 3
      }}>
        <Button
          variant="outlined"
          onClick={handleLoadData}
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
          Cargar Datos
        </Button>
        
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
      </Box>
    </Box>
  );
};

export default RefraccionModal; 