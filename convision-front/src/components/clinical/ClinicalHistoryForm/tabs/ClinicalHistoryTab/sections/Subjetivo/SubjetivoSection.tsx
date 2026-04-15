import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Checkbox, FormControlLabel, Chip } from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import MotiliadModal from './MotiliadModal';

interface MotiliadData {
  data: { [key: string]: string | boolean };
  timestamp: string;
}

const SubjetivoSection: React.FC<SectionProps> = ({ form, serverErrors, renderField, onModalOpen, onModalClose, isModalActive }) => {
  const [savedMotiliadData, setSavedMotiliadData] = useState<MotiliadData | null>(null);
  const [showMotiliadModal, setShowMotiliadModal] = useState(false);
  const [editingMotiliadId, setEditingMotiliadId] = useState<string | null>(null);

  // Handle modal reopening from parent component
  React.useEffect(() => {
    if (isModalActive && savedMotiliadData) {
      handleOpenMotiliadModal();
    }
  }, [isModalActive]);

  const fields: FieldDefinition[] = [
    // Subjetivo fields - Top section
    { name: "subjetivo_od_esfera", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_od_cilindro", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_od_eje", label: "", type: "text", placeholder: "0" },
    { name: "subjetivo_od_add", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_od_dp", label: "", type: "text", placeholder: "0" },
    { name: "subjetivo_od_lejos", label: "", type: "text", placeholder: "20" },
    { name: "subjetivo_od_cerca", label: "", type: "text", placeholder: "20" },
    
    { name: "subjetivo_oi_esfera", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_oi_cilindro", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_oi_eje", label: "", type: "text", placeholder: "0" },
    { name: "subjetivo_oi_add", label: "", type: "text", placeholder: "0.0" },
    { name: "subjetivo_oi_dp", label: "", type: "text", placeholder: "0" },
    { name: "subjetivo_oi_lejos", label: "", type: "text", placeholder: "20" },
    { name: "subjetivo_oi_cerca", label: "", type: "text", placeholder: "20" },

    // Motilidad ocular fields
    { name: "motilidad_krimsky", label: "Krimsky", type: "checkbox" },
    { name: "motilidad_cover", label: "CoverT", type: "checkbox" },
    { name: "motilidad_vl", label: "", type: "text", placeholder: "Ortho" },
    { name: "motilidad_x100", label: "", type: "text", placeholder: "" },
    { name: "motilidad_20cm", label: "", type: "text", placeholder: "" },
    { name: "motilidad_ppc", label: "", type: "text", placeholder: "" },

    // Disposición field
    { name: "disposicion", label: "", type: "textarea", placeholder: "" }
  ];

  const handleOpenMotiliadModal = () => {
    // If there's saved data, we're editing it
    if (savedMotiliadData) {
      setEditingMotiliadId('motiliad_1');
    } else {
      setEditingMotiliadId(null);
    }
    setShowMotiliadModal(true);
    onModalOpen?.('motilidad', 'motilidad-button');
    
    // Reset scroll position to top when modal opens
    setTimeout(() => {
      const modalContainer = document.querySelector('[data-modal="motilidad"]');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }, 100);
  };

  const handleCloseMotiliadModal = () => {
    setShowMotiliadModal(false);
    setEditingMotiliadId(null);
    onModalClose?.();
  };

  const handleSaveMotiliad = (motiliadData: { [key: string]: string | boolean }) => {
    const timestamp = new Date().toLocaleString();
    
    // Always update the single saved item or create new one
    const savedEntry: MotiliadData = {
      data: motiliadData,
      timestamp
    };
    setSavedMotiliadData(savedEntry);
    
    setShowMotiliadModal(false);
    setEditingMotiliadId(null);
  };

  const getCurrentMotiliadData = () => {
    if (savedMotiliadData && editingMotiliadId) {
      return savedMotiliadData.data || {};
    }
    return {};
  };

  const handleDisposicionButton = () => {
    // Placeholder for future functionality
    console.log('Disposicion button clicked');
  };

  // Show modal if needed
  if (showMotiliadModal) {
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
        data-modal="motilidad"
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
        <MotiliadModal
          form={form}
          serverErrors={serverErrors}
          onSave={handleSaveMotiliad}
          onCancel={handleCloseMotiliadModal}
          initialData={getCurrentMotiliadData()}
          isEditing={!!editingMotiliadId}
        />
      </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%'
    }}>
      {/* Top Section - Subjetivo */}
      <Box>
        
        {/* Split into two sections horizontally */}
        <Box sx={{ 
          display: 'flex',
          gap: 2
        }}>
          {/* First Section - 3/4 width - Empty title for alignment */}
          <Box sx={{
            flex: 3
          }}>
            {/* Empty title to align with "Agudeza visual" */}
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 500,
              fontSize: '0.85rem',
              mb: 1,
              textAlign: 'left',
              visibility: 'hidden'
            }}>
              &nbsp;
            </Typography>
            
            {/* Headers for first box */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              mb: 1
            }}>
              <Box sx={{ flex: 1, minWidth: '34px' }}></Box>
              {['Esfera', 'Cilindro', 'Eje', 'ADD', 'DP'].map((header) => (
                <Box key={header} sx={{ flex: 4 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', color: '#374151' }}>
                    {header}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* OD Row for first box */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: '34px' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                  OD
                </Typography>
              </Box>
              {[
                { field: 'subjetivo_od_esfera', value: form.watch('subjetivo_od_esfera') },
                { field: 'subjetivo_od_cilindro', value: form.watch('subjetivo_od_cilindro') },
                { field: 'subjetivo_od_eje', value: form.watch('subjetivo_od_eje') },
                { field: 'subjetivo_od_add', value: form.watch('subjetivo_od_add') },
                { field: 'subjetivo_od_dp', value: form.watch('subjetivo_od_dp') }
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

            {/* OI Row for first box */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: '34px' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                  OI
                </Typography>
              </Box>
              {[
                { field: 'subjetivo_oi_esfera', value: form.watch('subjetivo_oi_esfera') },
                { field: 'subjetivo_oi_cilindro', value: form.watch('subjetivo_oi_cilindro') },
                { field: 'subjetivo_oi_eje', value: form.watch('subjetivo_oi_eje') },
                { field: 'subjetivo_oi_add', value: form.watch('subjetivo_oi_add') },
                { field: 'subjetivo_oi_dp', value: form.watch('subjetivo_oi_dp') }
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

          {/* Vertical Divider Line */}
          <Box sx={{ 
            width: '2px', 
            backgroundColor: '#e2e8f0',
            minHeight: '200px',
            alignSelf: 'stretch'
          }} />

          {/*Agudeza visual */}
          <Box sx={{
            flex: 1.2
          }}>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 700,
              fontSize: '0.85rem',
              mb: 1,
              textAlign: 'left'
            }}>
              Agudeza visual
            </Typography>

            {/* Headers for second box */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              mb: 1
            }}>
              <Box sx={{ flex: 1 }}></Box>
              {['Lejos', 'Cerca'].map((header) => (
                <Box key={header} sx={{ flex: 4 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', color: '#374151' }}>
                    {header}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* OD Row for second box */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                  20
                </Typography>
              </Box>
              {[
                { field: 'subjetivo_od_lejos', value: form.watch('subjetivo_od_lejos') },
                { field: 'subjetivo_od_cerca', value: form.watch('subjetivo_od_cerca') }
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

            {/* OI Row for second box */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                  20
                </Typography>
              </Box>
              {[
                { field: 'subjetivo_oi_lejos', value: form.watch('subjetivo_oi_lejos') },
                { field: 'subjetivo_oi_cerca', value: form.watch('subjetivo_oi_cerca') }
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

          {/* Motilidad ocular - Left side */}
          <Box sx={{
            flex: 3,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '2px solid #e0e0e0',
            borderLeft: '2px solid #e0e0e0',
            paddingRight: 2,
            paddingLeft: 2
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              fontSize: '1rem',
              mb: 2,
              color: '#1e293b'
            }}>
              Motilidad ocular
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, flex: 1 }}>
              {/* First div - 1/3 width - Checkboxes above VL */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 2, minWidth: 0 }}>
                {/* Checkboxes row - above VL field */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, margin: 0, padding: 0 }}>
                  <Box sx={{ 
                    margin: 0, 
                    padding: 0, 
                    '& .flex.flex-row.items-start.space-x-3.space-y-0.p-2': { 
                      marginTop: '0 !important',
                      margin: '0 !important',
                      padding: '0 !important'
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'motilidad_krimsky')!)}
                  </Box>
                  
                  <Box sx={{ 
                    margin: 0, 
                    padding: 0, 
                    '& .flex.flex-row.items-start.space-x-3.space-y-0.p-2': { 
                      marginTop: '0 !important',
                      margin: '0 !important',
                      padding: '0 !important'
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'motilidad_cover')!)}
                  </Box>
                </Box>
                
                <Box sx={{ margin: 0, padding: 0 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0, margin: 0, padding: 0 }}>VL</Typography>
                  <TextField
                    value={form.watch('motilidad_vl') || ''}
                    onChange={(e) => form.setValue('motilidad_vl', e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Ortho"
                    sx={{ bgcolor: 'white', margin: 0, padding: 0 }}
                  />
                </Box>
              </Box>

              {/* Second div - 1/3 width - 40cm and 20cm */}
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'stretch', flex: 1, minWidth: 0, ml: 1 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>40cm</Typography>
                  <TextField
                    value={form.watch('motilidad_x100') || ''}
                    onChange={(e) => form.setValue('motilidad_x100', e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>20cm</Typography>
                  <TextField
                    value={form.watch('motilidad_20cm') || ''}
                    onChange={(e) => form.setValue('motilidad_20cm', e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
              </Box>

              {/* Third div - 1/3 width */}
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'stretch', flex: 2.5, minWidth: 0 }}>
                <Box sx={{ 
                  display: '-ms-flexbox',
                  justifyContent: 'inherit',
                  mb: 1
                }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>PPC</Typography>
                  <TextField
                    value={form.watch('motilidad_ppc') || ''}
                    onChange={(e) => form.setValue('motilidad_ppc', e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
                
                {/* Motilidad Button */}
                <Button
                  variant="contained"
                  startIcon={savedMotiliadData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
                  sx={{
                    backgroundColor: '#8BC34A',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#7CB342'
                    },
                    textTransform: 'none',
                    fontWeight: 500,
                    width: '100%',
                    height: '30px',
                    minHeight: '30px',
                    maxHeight: '30px',
                    lineHeight: 1,
                    px: 2,
                    justifyContent: 'center',
                    '& .MuiButton-startIcon': {
                      marginRight: 0
                    },
                    mb: 1
                  }}
                  onClick={handleOpenMotiliadModal}
                >
                  {savedMotiliadData ? 'Modificar' : ''}
                </Button>

                {/* History container - shows saved motilidad entry */}
                <Box sx={{ 
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 1,
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  minHeight: '60px',
                  flex: 1
                }}>
                  {/* Show saved motilidad entry */}
                  {savedMotiliadData && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip
                        label={`Motilidad - ${savedMotiliadData.timestamp}`}
                        onClick={handleOpenMotiliadModal}
                        onDelete={() => setSavedMotiliadData(null)}
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
          </Box>

          {/* Disposición*/}
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              fontSize: '1rem',
              mb: 2,
              color: '#1e293b'
            }}>
              Disposición
            </Typography>
            
            {/* Disposición Button */}
            <Button
              variant="contained"
              startIcon={<Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
              sx={{
                backgroundColor: '#8BC34A',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#7CB342'
                },
                textTransform: 'none',
                fontWeight: 500,
                width: '100%',
                mb: 2
              }}
              onClick={handleDisposicionButton}
            >
            </Button>
            
            {/* Text area taking most of the space */}
            <Box sx={{ 
              flex: 1,
              '& .MuiTextField-root': {
                height: '100%',
                '& .MuiInputBase-root': {
                  height: '100%',
                  alignItems: 'flex-start'
                }
              }
            }}>
              {renderField(fields.find(f => f.name === 'disposicion')!)}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SubjetivoSection;
