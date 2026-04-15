import React, { useState } from 'react';
import { Box, Typography, Button, Chip, TextField } from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import BiomicroscopiaSection from './BiomicroscopiaSection';
import OftalmoscopiaSection from './OftalmoscopiaSection';

interface BiomicroscopyData {
  data: { [key: string]: string };
  timestamp: string;
}

interface OftalmoscopiaData {
  data: { [key: string]: string };
  timestamp: string;
}

const LensometriaSection: React.FC<SectionProps> = ({ form, serverErrors, renderField, onModalOpen, onModalClose, isModalActive }) => {
  const [showBiomicroscopia, setShowBiomicroscopia] = useState(false);
  const [showOftalmoscopia, setShowOftalmoscopia] = useState(false);
  const [savedBiomicroscopyData, setSavedBiomicroscopyData] = useState<BiomicroscopyData | null>(null);
  const [savedOftalmoscopiaData, setSavedOftalmoscopiaData] = useState<OftalmoscopiaData | null>(null);

  // Handle modal reopening from parent component
  React.useEffect(() => {
    if (isModalActive) {
      // Determine which modal was last opened based on saved data
      if (savedBiomicroscopyData && !savedOftalmoscopiaData) {
        handleOpenBiomicroscopia();
      } else if (savedOftalmoscopiaData && !savedBiomicroscopyData) {
        handleOpenOftalmoscopia();
      } else if (savedBiomicroscopyData && savedOftalmoscopiaData) {
        // If both have data, open the most recent one
        const biomicroscopiaTime = new Date(savedBiomicroscopyData.timestamp).getTime();
        const oftalmoscopiaTime = new Date(savedOftalmoscopiaData.timestamp).getTime();
        if (biomicroscopiaTime > oftalmoscopiaTime) {
          handleOpenBiomicroscopia();
        } else {
          handleOpenOftalmoscopia();
        }
      }
    }
  }, [isModalActive]);

  // Get form values
  const formValues = form.watch();

  const handleOpenBiomicroscopia = () => {
    setShowBiomicroscopia(true);
    onModalOpen?.('biomicroscopia', 'biomicroscopia-button');
    
    // Reset scroll position to top when modal opens
    setTimeout(() => {
      const modalContainer = document.querySelector('[data-modal="biomicroscopia"]');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }, 100);
  };

  const handleCloseBiomicroscopia = () => {
    setShowBiomicroscopia(false);
    onModalClose?.();
  };

  const handleSaveBiomicroscopia = (biomicroscopyData: { [key: string]: string }) => {
    const timestamp = new Date().toLocaleString();
    
    setSavedBiomicroscopyData({
        data: biomicroscopyData,
        timestamp
    });
    
    setShowBiomicroscopia(false);
  };

  const getCurrentBiomicroscopyData = () => {
    return savedBiomicroscopyData?.data || {};
  };

  const handleOpenOftalmoscopia = () => {
    setShowOftalmoscopia(true);
    onModalOpen?.('oftalmoscopia', 'oftalmoscopia-button');
    
    // Reset scroll position to top when modal opens
    setTimeout(() => {
      const modalContainer = document.querySelector('[data-modal="oftalmoscopia"]');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }, 100);
  };

  const handleCloseOftalmoscopia = () => {
    setShowOftalmoscopia(false);
    onModalClose?.();
  };

  const handleSaveOftalmoscopia = (oftalmoscopiaData: { [key: string]: string }) => {
    const timestamp = new Date().toLocaleString();
    
    setSavedOftalmoscopiaData({
        data: oftalmoscopiaData,
        timestamp
    });
    
    setShowOftalmoscopia(false);
  };

  const getCurrentOftalmoscopiaData = () => {
    return savedOftalmoscopiaData?.data || {};
  };

  // If a modal is active, show only the modal content
  if (showBiomicroscopia || showOftalmoscopia) {
    return (
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
          data-modal={showBiomicroscopia ? 'biomicroscopia' : 'oftalmoscopia'}
          sx={{ 
            backgroundColor: 'white',
            borderRadius: 2,
            maxWidth: 1200,
            maxHeight: '90vh',
            overflow: 'visible',
            width: '100%',
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {showBiomicroscopia && (
            <BiomicroscopiaSection
              form={form}
              serverErrors={serverErrors}
              renderField={renderField}
              onSave={handleSaveBiomicroscopia}
              onCancel={handleCloseBiomicroscopia}
              initialData={getCurrentBiomicroscopyData()}
            />
          )}
          {showOftalmoscopia && (
            <OftalmoscopiaSection
              form={form}
              serverErrors={serverErrors}
              renderField={renderField}
              onSave={handleSaveOftalmoscopia}
              onCancel={handleCloseOftalmoscopia}
              initialData={getCurrentOftalmoscopiaData()}
            />
          )}
        </Box>
      </Box>
    );
  }

  const fields: FieldDefinition[] = [
    // Lensometria fields - empty labels to avoid duplication
    { 
      name: "lensometria_od", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "lensometria_oi", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "lensometria_add", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Agudeza Visual - Lejania fields (empty labels so inputs are clean)
    { 
      name: "agudeza_lejania_sc_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_lejania_cc_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_lejania_ph_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_lejania_sc_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_lejania_cc_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_lejania_ph_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Agudeza Visual - Cercania fields
    { 
      name: "agudeza_cercania_sc_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_cercania_cc_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_cercania_ph_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_cercania_sc_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_cercania_cc_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "agudeza_cercania_ph_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // New sections - textarea fields (examen_externo and oftalmoscopia are disabled)
    { 
      name: "examen_externo", 
      label: "", 
      type: "textarea",
      placeholder: "",
      disabled: true
    },
    { 
      name: "oftalmoscopia", 
      label: "", 
      type: "textarea",
      placeholder: "",
      disabled: true
    },
    { 
      name: "observaciones", 
      label: "", 
      type: "textarea",
      placeholder: ""
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Two main boxes with equal sizing */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* First Box: Lensometría, Agudeza visual, and Observaciones */}
        <Box sx={{ 
          flex: 2,
          display: 'flex', 
          flexDirection: 'column',
          gap: 3,
          p: 3,
        }}>
          <Box sx={{flex: 1, display: 'flex', flexDirection: 'row', mb:-2}}>
            {/* Lensometria Section */}
            <Box sx={{ flex: 1, alignItems: 'center', borderRight: '2px solid #e0e0e0', paddingRight: 2, mr: 2 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              fontSize: '1rem',
              mb: 2,
              color: '#1e293b'
            }}>
              Lensometría
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{display:'flex', flexDirection: 'row', alignItems: 'center'}}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', flex: 2}}>
                  OD
                </Typography>
                <TextField
                  value={formValues.lensometria_od || ''}
                  onChange={(e) => form.setValue('lensometria_od', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white', flex: 6 }}
                />
              </Box>
              <Box sx={{display:'flex', flexDirection: 'row', alignItems: 'center'}}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', flex: 2}}>
                  OI
                </Typography>
                <TextField
                  value={formValues.lensometria_oi || ''}
                  onChange={(e) => form.setValue('lensometria_oi', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white', flex: 6 }}
                />
              </Box>
              <Box sx={{display:'flex', flexDirection: 'row', alignItems: 'center'}}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', flex: 2 }}>
                  ADD
                </Typography>
                <TextField
                  value={formValues.lensometria_add || ''}
                  onChange={(e) => form.setValue('lensometria_add', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white', flex: 6 }}
                />
              </Box>
            </Box>
            </Box>

            {/* Agudeza Visual Section */}
            <Box sx={{ flex: 3, paddingRight: 2 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              fontSize: '1rem',
              mb: 2,
              color: '#1e293b'
            }}>
              Agudeza visual
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Lejania Section */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  mb: 1,
                  textAlign: 'left'
                }}>
                  Lejana
                </Typography>
                
                {/* Headers */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  mb: 1
                }}>
                  <Box sx={{ flex: 1 }}></Box>
                  <Box sx={{ flex: 4 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                      SC
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}></Box>
                  <Box sx={{ flex: 4 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                      CC
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                      PH
                    </Typography>
                  </Box>
                </Box>

                {/* First Row */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>
                      20/
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_sc_1 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_sc_1', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>
                      20/
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_cc_1 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_cc_1', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_ph_1 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_ph_1', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                </Box>

                {/* Second Row */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>
                      20/
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_sc_2 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_sc_2', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>
                      20/
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_cc_2 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_cc_2', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box sx={{ flex: 4 }}>
                    <TextField
                      value={formValues.agudeza_lejania_ph_2 || ''}
                      onChange={(e) => form.setValue('agudeza_lejania_ph_2', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Vertical Divider Line */}
              <Box sx={{ 
                width: '2px', 
                backgroundColor: '#e2e8f0',
                minHeight: '200px',
                alignSelf: 'stretch'
              }} />

              {/* Cercania Section */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  mb: 1,
                  textAlign: 'left'
                }}>
                  Cercana
                </Typography>
                
                {/* Headers */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  mb: 1
                }}>
                  {['SC', 'CC', 'PH'].map((header) => (
                    <Box key={header} sx={{ flex: 4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                        {header}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* First Row */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  {[
                    { field: 'agudeza_cercania_sc_1' as const, value: formValues.agudeza_cercania_sc_1 },
                    { field: 'agudeza_cercania_cc_1' as const, value: formValues.agudeza_cercania_cc_1 },
                    { field: 'agudeza_cercania_ph_1' as const, value: formValues.agudeza_cercania_ph_1 }
                  ].map((input) => (
                    <Box key={input.field} sx={{ flex: 4 }}>
                      <TextField
                        value={input.value || ''}
                        onChange={(e) => form.setValue(input.field as any, e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ bgcolor: 'white' }}
                      />
                    </Box>
                  ))}
                </Box>

                {/* Second Row */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { field: 'agudeza_cercania_sc_2' as const, value: formValues.agudeza_cercania_sc_2 },
                    { field: 'agudeza_cercania_cc_2' as const, value: formValues.agudeza_cercania_cc_2 },
                    { field: 'agudeza_cercania_ph_2' as const, value: formValues.agudeza_cercania_ph_2 }
                  ].map((input) => (
                    <Box key={input.field} sx={{ flex: 4 }}>
                      <TextField
                        value={input.value || ''}
                        onChange={(e) => form.setValue(input.field as any, e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ bgcolor: 'white' }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            </Box>

          </Box>

          <Box sx={{flex: 1, display: 'flex'}}>
            {/* Observaciones Section */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                fontSize: '1rem',
                mb: 2,
                color: '#1e293b'
              }}>
                Observaciones
              </Typography>
              
              <TextField
                value={formValues.observaciones || ''}
                onChange={(e) => form.setValue('observaciones', e.target.value)}
                multiline
                rows={2}
                fullWidth
                sx={{ bgcolor: 'white'}}
              />
            </Box>
          </Box>
        </Box>

        {/* Second Box: Examen externo and Oftalmoscopia */}
        <Box sx={{ 
          flex: 1,
          display: 'flex', 
          flexDirection: 'column',
          gap: 3,
          borderLeft: '2px solid #e0e0e0',
          p: 3,
        }}>
          {/* Examen externo Section */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '2px solid #e0e0e0', pb: 2 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            color: '#1e293b'
          }}>
            Examen externo
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {/* Green Button */}
            <Button
              variant="contained"
              startIcon={savedBiomicroscopyData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
              sx={{
                backgroundColor: '#8BC34A',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#7CB342'
                },
                textTransform: 'none',
                fontWeight: 500,
                width: '100%'
              }}
              onClick={handleOpenBiomicroscopia}
            >
              {savedBiomicroscopyData ? 'Modificar' : ''}
            </Button>
            
            {/* History container - only shows saved biomicroscopy entries */}
            <Box sx={{ 
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              p: 1,
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              flex: 1
            }}>
              {/* Show saved biomicroscopy entries */}
              {savedBiomicroscopyData && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Chip
                    label={`Biomicroscopia - ${savedBiomicroscopyData.timestamp}`}
                    onClick={handleOpenBiomicroscopia}
                    onDelete={() => setSavedBiomicroscopyData(null)}
                    icon={<Edit />}
                      size="small"
                      sx={{
                        justifyContent: 'flex-start',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        '&:hover': {
                          backgroundColor: '#bbdefb',
                        },
                        cursor: 'pointer',
                        alignSelf: 'flex-start'
                      }}
                    />
                </Box>
              )}
            </Box>
          </Box>
          </Box>

          {/* Oftalmoscopia Section */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            color: '#1e293b'
          }}>
            Oftalmoscopia
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            {/* Green Button */}
            <Button
              variant="contained"
              startIcon={savedOftalmoscopiaData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
              sx={{
                backgroundColor: '#8BC34A',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#7CB342'
                },
                textTransform: 'none',
                fontWeight: 500,
                width: '100%'
              }}
              onClick={handleOpenOftalmoscopia}
            >
              {savedOftalmoscopiaData ? 'Modificar' : ''}
            </Button>
            
            {/* History container - only shows saved oftalmoscopia entries */}
            <Box sx={{ 
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              p: 1,
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              flex: 1
            }}>
              {/* Show saved oftalmoscopia entries */}
              {savedOftalmoscopiaData && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Chip
                    label={`Oftalmoscopia - ${savedOftalmoscopiaData.timestamp}`}
                    onClick={handleOpenOftalmoscopia}
                    onDelete={() => setSavedOftalmoscopiaData(null)}
                    icon={<Edit />}
                      size="small"
                      sx={{
                        justifyContent: 'flex-start',
                        backgroundColor: '#e8f5e8',
                        color: '#2e7d32',
                        '&:hover': {
                          backgroundColor: '#c8e6c9',
                        },
                        cursor: 'pointer',
                        alignSelf: 'flex-start'
                      }}
                    />
                </Box>
              )}
            </Box>
          </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LensometriaSection; 