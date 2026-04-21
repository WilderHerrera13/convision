import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
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

interface TestModalProps extends SectionProps {
  onSave: (data: { [key: string]: string | boolean }) => void;
  onCancel: () => void;
  initialData?: { [key: string]: string | boolean };
  isEditing?: boolean;
}

const TestModal: React.FC<TestModalProps> = ({ 
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
    // Visión Cromática fields
    vision_cromatica_test_usado: '',
    vision_cromatica_od: '',
    vision_cromatica_oi: '',
    vision_cromatica_interpretacion: '',
    
    // Estereopsis fields
    estereopsis_test_usado: '',
    estereopsis_agudeza: '',
    
    // Tonometría fields
    tonometria_metodo: '',
    tonometria_hora: '',
    tonometria_tonometro: '',
    tonometria_od: '',
    tonometria_oi: '',
    
    // Test adicionales
    test_adicionales: '',
    
    ...initialData
  }), [initialData]);

  // Local state for test modal data
  const [testData, setTestData] = useState(initialDataWithDefaults);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Check if data has changed from initial values
  const hasChanges = useMemo(() => {
    return Object.keys(initialDataWithDefaults).some(key => {
      return testData[key] !== initialDataWithDefaults[key];
    });
  }, [testData, initialDataWithDefaults]);

  // Reset data when initialData changes (when editing)
  useEffect(() => {
    setTestData(initialDataWithDefaults);
  }, [initialDataWithDefaults]);

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setTestData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = () => {
    onSave(testData);
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
            Test
          </Typography>
        </Box>

        {/* Content Container */}
        <Box sx={{ 
          display: 'flex',
          gap: 3,
          p: 3,
          flex: 1,
          backgroundColor: '#f8fafc'
        }}>
        {/* Left Column */}
        <Box sx={{ 
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          {/* Visión Cromática Section */}
          <SectionDivider title="Visión Cromática">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: 0.5,
                  color: 'black'
                }}>
                  Test usado
                </Typography>
                <TextField
                  size="small"
                  value={testData.vision_cromatica_test_usado || ''}
                  onChange={(e) => handleFieldChange('vision_cromatica_test_usado', e.target.value)}
                  sx={{ 
                    width: '100%',
                    '& .MuiInputBase-root': {
                      backgroundColor: 'white',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    OD
                  </Typography>
                  <TextField
                    size="small"
                    value={testData.vision_cromatica_od || ''}
                    onChange={(e) => handleFieldChange('vision_cromatica_od', e.target.value)}
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
                    OI
                  </Typography>
                  <TextField
                    size="small"
                    value={testData.vision_cromatica_oi || ''}
                    onChange={(e) => handleFieldChange('vision_cromatica_oi', e.target.value)}
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

              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: 0.5,
                  color: 'black'
                }}>
                  Interpretación
                </Typography>
                <TextField
                  multiline
                  rows={3}
                  value={testData.vision_cromatica_interpretacion || ''}
                  onChange={(e) => handleFieldChange('vision_cromatica_interpretacion', e.target.value)}
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
          </SectionDivider>

          {/* Estereopsis Section */}
          <SectionDivider title="Estereopsis">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: 0.5,
                  color: 'black'
                }}>
                  Test usado
                </Typography>
                <TextField
                  size="small"
                  value={testData.estereopsis_test_usado || ''}
                  onChange={(e) => handleFieldChange('estereopsis_test_usado', e.target.value)}
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
                  Estero agudeza
                </Typography>
                <TextField
                  size="small"
                  value={testData.estereopsis_agudeza || ''}
                  onChange={(e) => handleFieldChange('estereopsis_agudeza', e.target.value)}
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
          </SectionDivider>

          {/* Tonometría Section */}
          <SectionDivider title="Tonometría">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    Método
                  </Typography>
                  <TextField
                    size="small"
                    value={testData.tonometria_metodo || ''}
                    onChange={(e) => handleFieldChange('tonometria_metodo', e.target.value)}
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
                    Hora
                  </Typography>
                  <TextField
                    size="small"
                    type="time"
                    value={testData.tonometria_hora || ''}
                    onChange={(e) => handleFieldChange('tonometria_hora', e.target.value)}
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

              <Box>
                <Typography sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: 0.5,
                  color: 'black'
                }}>
                  Tonómetro
                </Typography>
                <TextField
                  size="small"
                  value={testData.tonometria_tonometro || ''}
                  onChange={(e) => handleFieldChange('tonometria_tonometro', e.target.value)}
                  sx={{ 
                    width: '100%',
                    '& .MuiInputBase-root': {
                      backgroundColor: 'white',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5,
                    color: 'black'
                  }}>
                    OD
                  </Typography>
                  <TextField
                    size="small"
                    value={testData.tonometria_od || ''}
                    onChange={(e) => handleFieldChange('tonometria_od', e.target.value)}
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
                    OI
                  </Typography>
                  <TextField
                    size="small"
                    value={testData.tonometria_oi || ''}
                    onChange={(e) => handleFieldChange('tonometria_oi', e.target.value)}
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

        {/* Vertical Divider */}
        <Box sx={{
          width: '2px',
          backgroundColor: '#e2e8f0',
          flexShrink: 0
        }} />

        {/* Right Column - Test adicionales */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            flex: 1
          }}>
            {/* Section Title with Line */}
            <Box sx={{ position: 'relative', mb: 3, flexShrink: 0 }}>
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
                Test adicionales
              </Typography>
            </Box>
            
            {/* Section Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                multiline
                rows={20}
                value={testData.test_adicionales || ''}
                onChange={(e) => handleFieldChange('test_adicionales', e.target.value)}
                sx={{ 
                  flex: 1,
                  '& .MuiInputBase-root': {
                    backgroundColor: 'white',
                    fontSize: '0.875rem',
                    height: '100%',
                    alignItems: 'flex-start'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
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

export default TestModal;

