import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { Add, Visibility } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import BiomicroscopiaSection from './BiomicroscopiaSection';
import OftalmoscopiaSection from './OftalmoscopiaSection';

interface BiomicroscopyData {
  id: string;
  data: { [key: string]: string };
  timestamp: string;
}

interface OftalmoscopiaData {
  id: string;
  data: { [key: string]: string };
  timestamp: string;
}

const LensometriaSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const [showBiomicroscopia, setShowBiomicroscopia] = useState(false);
  const [showOftalmoscopia, setShowOftalmoscopia] = useState(false);
  const [savedBiomicroscopyData, setSavedBiomicroscopyData] = useState<BiomicroscopyData[]>([]);
  const [savedOftalmoscopiaData, setSavedOftalmoscopiaData] = useState<OftalmoscopiaData[]>([]);
  const [editingBiomicroscopyId, setEditingBiomicroscopyId] = useState<string | null>(null);
  const [editingOftalmoscopiaId, setEditingOftalmoscopiaId] = useState<string | null>(null);

  const handleOpenBiomicroscopia = () => {
    setEditingBiomicroscopyId(null);
    setShowBiomicroscopia(true);
  };

  const handleEditBiomicroscopia = (id: string) => {
    setEditingBiomicroscopyId(id);
    setShowBiomicroscopia(true);
  };

  const handleCloseBiomicroscopia = () => {
    setShowBiomicroscopia(false);
    setEditingBiomicroscopyId(null);
  };

  const handleSaveBiomicroscopia = (biomicroscopyData: { [key: string]: string }) => {
    const timestamp = new Date().toLocaleString();
    
    if (editingBiomicroscopyId) {
      setSavedBiomicroscopyData(prev => 
        prev.map(item => 
          item.id === editingBiomicroscopyId 
            ? { ...item, data: biomicroscopyData, timestamp }
            : item
        )
      );
    } else {
      const newEntry: BiomicroscopyData = {
        id: `biomicroscopy_${Date.now()}`,
        data: biomicroscopyData,
        timestamp
      };
      setSavedBiomicroscopyData(prev => [...prev, newEntry]);
    }
    
    setShowBiomicroscopia(false);
    setEditingBiomicroscopyId(null);
  };

  const getCurrentBiomicroscopyData = () => {
    if (editingBiomicroscopyId) {
      const existingData = savedBiomicroscopyData.find(item => item.id === editingBiomicroscopyId);
      return existingData?.data || {};
    }
    return {};
  };

  const handleOpenOftalmoscopia = () => {
    setEditingOftalmoscopiaId(null);
    setShowOftalmoscopia(true);
  };

  const handleEditOftalmoscopia = (id: string) => {
    setEditingOftalmoscopiaId(id);
    setShowOftalmoscopia(true);
  };

  const handleCloseOftalmoscopia = () => {
    setShowOftalmoscopia(false);
    setEditingOftalmoscopiaId(null);
  };

  const handleSaveOftalmoscopia = (oftalmoscopiaData: { [key: string]: string }) => {
    const timestamp = new Date().toLocaleString();
    
    if (editingOftalmoscopiaId) {
      setSavedOftalmoscopiaData(prev => 
        prev.map(item => 
          item.id === editingOftalmoscopiaId 
            ? { ...item, data: oftalmoscopiaData, timestamp }
            : item
        )
      );
    } else {
      const newEntry: OftalmoscopiaData = {
        id: `oftalmoscopia_${Date.now()}`,
        data: oftalmoscopiaData,
        timestamp
      };
      setSavedOftalmoscopiaData(prev => [...prev, newEntry]);
    }
    
    setShowOftalmoscopia(false);
    setEditingOftalmoscopiaId(null);
  };

  const getCurrentOftalmoscopiaData = () => {
    if (editingOftalmoscopiaId) {
      const existingData = savedOftalmoscopiaData.find(item => item.id === editingOftalmoscopiaId);
      return existingData?.data || {};
    }
    return {};
  };

  if (showBiomicroscopia) {
    return (
      <BiomicroscopiaSection
        form={form}
        serverErrors={serverErrors}
        renderField={renderField}
        onSave={handleSaveBiomicroscopia}
        onCancel={handleCloseBiomicroscopia}
        initialData={getCurrentBiomicroscopyData()}
        isEditing={!!editingBiomicroscopyId}
      />
    );
  }

  if (showOftalmoscopia) {
    return (
      <OftalmoscopiaSection
        form={form}
        serverErrors={serverErrors}
        renderField={renderField}
        onSave={handleSaveOftalmoscopia}
        onCancel={handleCloseOftalmoscopia}
        initialData={getCurrentOftalmoscopiaData()}
        isEditing={!!editingOftalmoscopiaId}
      />
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
    <Box sx={{ 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%'
    }}>
      {/* First Row - Lensometria and Agudeza Visual */}
      <Box sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'stretch',
        flexDirection: { xs: 'column', lg: 'row' },
        width: '100%'
      }}>
        {/* Lensometria Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          width: { xs: '100%', lg: '280px' },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            textAlign: 'left',
            color: '#000'
          }}>
            Lensometria
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
            {/* OD Field */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '-30px' }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                minWidth: '40px',
                fontWeight: 500,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                height: '40px'
              }}>
                OD
              </Typography>
              <Box sx={{ 
                flex: 1,
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  marginTop: '0 !important',
                  marginBottom: '0 !important'
                }
              }}>
                {renderField(fields.find(f => f.name === 'lensometria_od')!)}
              </Box>
            </Box>

            {/* OI Field */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '-30px' }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                minWidth: '40px',
                fontWeight: 500,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                height: '40px'
              }}>
                OI
              </Typography>
              <Box sx={{ 
                flex: 1,
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  marginTop: '0 !important',
                  marginBottom: '0 !important'
                }
              }}>
                {renderField(fields.find(f => f.name === 'lensometria_oi')!)}
              </Box>
            </Box>

            {/* ADD Field */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                minWidth: '40px',
                fontWeight: 500,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                height: '40px'
              }}>
                ADD
              </Typography>
              <Box sx={{ 
                flex: 1,
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  marginTop: '0 !important',
                  marginBottom: '0 !important'
                }
              }}>
                {renderField(fields.find(f => f.name === 'lensometria_add')!)}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Agudeza Visual Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          flex: 1,
          minWidth: { xs: '100%', lg: '500px' },
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            textAlign: 'left',
            color: '#000'
          }}>
            Agudeza visual
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
            {/* Lejania Section */}
            <Box sx={{
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              p: 1,
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 500,
                fontSize: '0.85rem',
                mb: 1,
                textAlign: 'left'
              }}>
                Lejania
              </Typography>
              
              {/* Headers */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5,
                mb: 1,
                marginBottom: '-5px'
              }}>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  SC
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  CC
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  PH
                </Typography>
              </Box>

              {/* First Row - with 20/ prefix for SC and CC */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5,
                mb: 0.5,
                marginBottom: '-30px'
              }}>
                {/* SC Column - First Row with 20/ prefix */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ 
                    fontSize: '0.75rem', 
                    minWidth: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '32px'
                  }}>20/</Typography>
                  <Box sx={{ 
                    flex: 1,
                    '& .MuiTextField-root': {
                      margin: '0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'agudeza_lejania_sc_1')!)}
                  </Box>
                </Box>
                
                {/* CC Column - First Row with 20/ prefix */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ 
                    fontSize: '0.75rem', 
                    minWidth: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '32px'
                  }}>20/</Typography>
                  <Box sx={{ 
                    flex: 1,
                    '& .MuiTextField-root': {
                      margin: '0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'agudeza_lejania_cc_1')!)}
                  </Box>
                </Box>
                
                {/* PH Column - First Row (no prefix) */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_lejania_ph_1')!)}
                </Box>
              </Box>

              {/* Second Row - with 20/ prefix for SC and CC */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5
              }}>
                {/* SC Column - Second Row with 20/ prefix */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ 
                    fontSize: '0.75rem', 
                    minWidth: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '32px'
                  }}>20/</Typography>
                  <Box sx={{ 
                    flex: 1,
                    '& .MuiTextField-root': {
                      margin: '0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'agudeza_lejania_sc_2')!)}
                  </Box>
                </Box>
                
                {/* CC Column - Second Row with 20/ prefix */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ 
                    fontSize: '0.75rem', 
                    minWidth: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    verticalAlign: 'middle',
                    lineHeight: '32px'
                  }}>20/</Typography>
                  <Box sx={{ 
                    flex: 1,
                    '& .MuiTextField-root': {
                      margin: '0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'agudeza_lejania_cc_2')!)}
                  </Box>
                </Box>
                
                {/* PH Column - Second Row (no prefix) */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_lejania_ph_2')!)}
                </Box>
              </Box>
            </Box>

            {/* Cercania Section */}
            <Box sx={{
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              p: 1,
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 500,
                fontSize: '0.85rem',
                mb: 1,
                textAlign: 'left'
              }}>
                Cercania
              </Typography>
              
              {/* Headers */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5,
                mb: 1,
                marginBottom: '-5px'
              }}>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  SC
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  CC
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  PH
                </Typography>
              </Box>

              {/* First Row - no prefixes for Cercania */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5,
                mb: 0.5,
                marginBottom: '-30px'
              }}>
                {/* SC Column - First Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_sc_1')!)}
                </Box>
                
                {/* CC Column - First Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_cc_1')!)}
                </Box>
                
                {/* PH Column - First Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_ph_1')!)}
                </Box>
              </Box>

              {/* Second Row - no prefixes for Cercania */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0.5
              }}>
                {/* SC Column - Second Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_sc_2')!)}
                </Box>
                
                {/* CC Column - Second Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_cc_2')!)}
                </Box>
                
                {/* PH Column - Second Row */}
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'agudeza_cercania_ph_2')!)}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Second Row - New Sections */}
      <Box sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'stretch',
        flexDirection: { xs: 'column', lg: 'row' },
        width: '100%'
      }}>
        {/* Examen externo Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            textAlign: 'left',
            color: '#000'
          }}>
            Examen externo
          </Typography>
          
          {/* History container - only shows saved biomicroscopy entries */}
          <Box sx={{ 
            flex: 1,
            mb: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: '120px'
          }}>
            {/* Show saved biomicroscopy entries */}
            {savedBiomicroscopyData.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {savedBiomicroscopyData.map((entry) => (
                  <Chip
                    key={entry.id}
                    label={`Biomicroscopia - ${entry.timestamp}`}
                    onClick={() => handleEditBiomicroscopia(entry.id)}
                    onDelete={() => {
                      setSavedBiomicroscopyData(prev => 
                        prev.filter(item => item.id !== entry.id)
                      );
                    }}
                    icon={<Visibility />}
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
                ))}
              </Box>
            ) : (
              <Typography sx={{ 
                color: '#9ca3af', 
                fontStyle: 'italic', 
                fontSize: '0.875rem',
                p: 1
              }}>
                No hay exámenes de biomicroscopia registrados
              </Typography>
            )}
          </Box>
          
          {/* Green Button */}
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
              fontWeight: 500
            }}
            onClick={handleOpenBiomicroscopia}
          >
            
          </Button>
        </Box>

        {/* Oftalmoscopia Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            textAlign: 'left',
            color: '#000'
          }}>
            Oftalmoscopia
          </Typography>
          
          {/* History container - only shows saved oftalmoscopia entries */}
          <Box sx={{ 
            flex: 1,
            mb: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minHeight: '120px'
          }}>
            {/* Show saved oftalmoscopia entries */}
            {savedOftalmoscopiaData.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {savedOftalmoscopiaData.map((entry) => (
                  <Chip
                    key={entry.id}
                    label={`Oftalmoscopia - ${entry.timestamp}`}
                    onClick={() => handleEditOftalmoscopia(entry.id)}
                    onDelete={() => {
                      setSavedOftalmoscopiaData(prev => 
                        prev.filter(item => item.id !== entry.id)
                      );
                    }}
                    icon={<Visibility />}
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
                ))}
              </Box>
            ) : (
              <Typography sx={{ 
                color: '#9ca3af', 
                fontStyle: 'italic', 
                fontSize: '0.875rem',
                p: 1
              }}>
                No hay exámenes de oftalmoscopia registrados
              </Typography>
            )}
          </Box>
          
          {/* Green Button */}
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
              fontWeight: 500
            }}
            onClick={handleOpenOftalmoscopia}
          >
            
          </Button>
        </Box>

        {/* Observaciones Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            mb: 2,
            textAlign: 'left',
            color: '#000'
          }}>
            Observaciones
          </Typography>
          
          <Box sx={{ 
            flex: 1,
            '& .MuiTextField-root': {
              margin: '0 !important',
              height: '100%',
              '& .MuiInputBase-root': {
                minHeight: '120px',
                height: '100%',
                alignItems: 'flex-start',
                '& textarea': {
                  resize: 'vertical',
                  flex: 1,
                  height: '100% !important',
                }
              }
            }
          }}>
            {renderField(fields.find(f => f.name === 'observaciones')!)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LensometriaSection; 