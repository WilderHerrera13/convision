import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import RefraccionModal from './RefraccionModal';

interface RefraccionData {
  id: string;
  data: { [key: string]: string | boolean };
  timestamp: string;
}

const QueratometriaRefraccionSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const [showRefraccionModal, setShowRefraccionModal] = useState(false);
  const [savedRefraccionData, setSavedRefraccionData] = useState<RefraccionData[]>([]);
  const [editingRefraccionId, setEditingRefraccionId] = useState<string | null>(null);

  const handleOpenRefraccionModal = () => {
    setEditingRefraccionId(null);
    setShowRefraccionModal(true);
  };

  const handleCloseRefraccionModal = () => {
    setShowRefraccionModal(false);
    setEditingRefraccionId(null);
  };

  const handleSaveRefraccion = (refraccionData: { [key: string]: string | boolean }) => {
    const timestamp = new Date().toLocaleString();
    
    if (editingRefraccionId) {
      setSavedRefraccionData(prev => 
        prev.map(item => 
          item.id === editingRefraccionId 
            ? { ...item, data: refraccionData, timestamp }
            : item
        )
      );
    } else {
      const newEntry: RefraccionData = {
        id: `refraccion_${Date.now()}`,
        data: refraccionData,
        timestamp
      };
      setSavedRefraccionData(prev => [...prev, newEntry]);
    }
    
    setShowRefraccionModal(false);
    setEditingRefraccionId(null);
  };

  const getCurrentRefraccionData = () => {
    if (editingRefraccionId) {
      const existingData = savedRefraccionData.find(item => item.id === editingRefraccionId);
      return existingData?.data || {};
    }
    return {};
  };

  if (showRefraccionModal) {
    return (
      <RefraccionModal
        form={form}
        serverErrors={serverErrors}
        renderField={renderField}
        onSave={handleSaveRefraccion}
        onCancel={handleCloseRefraccionModal}
        initialData={getCurrentRefraccionData()}
        isEditing={!!editingRefraccionId}
      />
    );
  }

  const fields: FieldDefinition[] = [
    // Queratometria fields
    { 
      name: "queratometria_od_horizontal", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_od_vertical", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_od_eje", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_od_dif", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_oi_horizontal", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_oi_vertical", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_oi_eje", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_oi_dif", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_presion_intraocular_od", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_presion_intraocular_oi", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Miras fields
    { 
      name: "queratometria_miras_1", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_miras_2", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Refraccion fields
    { 
      name: "refraccion_od_esfera", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_od_cilindro", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_od_eje", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_od_adicion", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_oi_esfera", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_oi_cilindro", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_oi_eje", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "refraccion_oi_adicion", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Additional Refraccion fields
    { 
      name: "refraccion_dinamica", 
      label: "Dinámica", 
      type: "checkbox"
    },
    { 
      name: "refraccion_estatica", 
      label: "Estática", 
      type: "checkbox"
    },
    { 
      name: "refraccion_reflejos", 
      label: "", 
      type: "text",
      placeholder: ""
    },

    // Test's fields
    { 
      name: "test_vision_cromatica_ao", 
      label: "", 
      type: "select",
      options: [
        { value: "Normal", label: "Normal" },
        { value: "Anormal", label: "Anormal" }
      ]
    },
    { 
      name: "test_estereoscopia_ao", 
      label: "", 
      type: "select",
      options: [
        { value: "Normal", label: "Normal" },
        { value: "Anormal", label: "Anormal" }
      ]
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
      {/* First Row - Queratometria and Refraccion */}
      <Box sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'stretch',
        flexDirection: { xs: 'column', lg: 'row' },
        width: '100%'
      }}>
        {/* Queratometria Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          pb: 0,
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
            Queratometria
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, mb: -7 }}>
            {/* Main keratometry data */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Headers */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                gap: 0.5,
                alignItems: 'center',
                mb: 0.5
              }}>
                <Box></Box>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  Horizontal
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  Vertical
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  Eje
                </Typography>
                <Typography sx={{ 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  Dif
                </Typography>
              </Box>

              {/* OD Row */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                gap: 0.5,
                alignItems: 'center',
                mb: -0.5,
                transform: 'translateY(-4px)'
              }}>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500
                }}>
                  OD
                </Typography>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_od_horizontal')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_od_vertical')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_od_eje')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_od_dif')!)}
                </Box>
              </Box>

              {/* OI Row */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                gap: 0.5,
                alignItems: 'center',
                transform: 'translateY(-30px)'
              }}>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500
                }}>
                  OI
                </Typography>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_oi_horizontal')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_oi_vertical')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_oi_eje')!)}
                </Box>
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '-2px 0 !important',
                    '& .MuiInputBase-root': {
                      height: '32px',
                      fontSize: '0.75rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'queratometria_oi_dif')!)}
                </Box>
              </Box>
            </Box>

            {/* Bottom section - Presion Intraocular and Miras */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              mt: -0.5,
              mb: -1,
              transform: 'translateY(-40px)',
              alignItems: 'flex-start'
            }}>
              {/* Presion Intraocular section */}
              <Box sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flex: 1
              }}>
                <Typography sx={{ 
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  minWidth: '80px',
                  mt: 4
                }}>
                  Presión Intraocular
                </Typography>
                
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  '& > *:not(:first-child)': {
                    transform: 'translateY(-30px)'
                  }
                }}>
                  {/* OD Row */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.5
                  }}>
                    <Typography sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 500,
                      minWidth: '30px',
                      mt: 2.5
                    }}>
                      OD
                    </Typography>
                    <Box sx={{ 
                      width: '80px',
                      '& .MuiTextField-root': {
                        margin: '-4px 0 !important',
                        '& .MuiInputBase-root': {
                          height: '32px',
                          fontSize: '0.75rem',
                        }
                      }
                    }}>
                      {renderField(fields.find(f => f.name === 'queratometria_presion_intraocular_od')!)}
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.75rem',
                      color: '#666',
                      mt: 2.5
                    }}>
                      mmHg
                    </Typography>
                  </Box>
                  
                  {/* OI Row */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.5
                  }}>
                    <Typography sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 500,
                      minWidth: '30px',
                      mt: 2.5
                    }}>
                      OI
                    </Typography>
                    <Box sx={{ 
                      width: '80px',
                      '& .MuiTextField-root': {
                        margin: '-4px 0 !important',
                        '& .MuiInputBase-root': {
                          height: '32px',
                          fontSize: '0.75rem',
                        }
                      }
                    }}>
                      {renderField(fields.find(f => f.name === 'queratometria_presion_intraocular_oi')!)}
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.75rem',
                      color: '#666',
                      mt: 2.5
                    }}>
                      mmHg
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Miras section */}
              <Box sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flex: 1
              }}>
                <Typography sx={{ 
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  minWidth: '50px',
                  mt: 5.5
                }}>
                  Miras
                </Typography>
                
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  '& > *:not(:first-child)': {
                    transform: 'translateY(-30px)'
                  }
                }}>
                  {/* First Miras field */}
                  <Box sx={{ 
                    width: '100px',
                    '& .MuiTextField-root': {
                      margin: '-4px 0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'queratometria_miras_1')!)}
                  </Box>
                  
                  {/* Second Miras field */}
                  <Box sx={{ 
                    width: '100px',
                    '& .MuiTextField-root': {
                      margin: '-4px 0 !important',
                      '& .MuiInputBase-root': {
                        height: '32px',
                        fontSize: '0.75rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'queratometria_miras_2')!)}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Refraccion Section */}
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          p: 2,
          pb: 0,
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
            Refraccion
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Headers */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '60px 1fr 1fr 1fr 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Box></Box>
              <Typography sx={{ 
                textAlign: 'center', 
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Esfera
              </Typography>
              <Typography sx={{ 
                textAlign: 'center', 
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Cilindro
              </Typography>
              <Typography sx={{ 
                textAlign: 'center', 
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Eje
              </Typography>
              <Typography sx={{ 
                textAlign: 'center', 
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Adición
              </Typography>
            </Box>

            {/* OD Row */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                gap: 0.5,
                alignItems: 'center',
                mb: -0.5,
                transform: 'translateY(-20px)'
            }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                fontWeight: 500
              }}>
                OD
              </Typography>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_od_esfera')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_od_cilindro')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_od_eje')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_od_adicion')!)}
              </Box>
            </Box>

            {/* OI Row */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 1fr 1fr 1fr',
                gap: 0.5,
                alignItems: 'center',
              transform: 'translateY(-63px)'
            }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                fontWeight: 500
              }}>
                OI
              </Typography>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_oi_esfera')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_oi_cilindro')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_oi_eje')!)}
              </Box>
              <Box sx={{ 
                '& .MuiTextField-root': {
                  margin: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '40px',
                    fontSize: '0.875rem',
                  }
                }
              }}>
                {renderField(fields.find(f => f.name === 'refraccion_oi_adicion')!)}
              </Box>
            </Box>

            {/* Bottom section - Checkboxes and Reflejos */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mt: -12,
              alignItems: 'flex-start'
            }}>
              {/* Left side - Checkboxes */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                flex: 1
              }}>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transform: 'translateY(-20px)'
                }}>
                  <Box sx={{ 
                    '& .MuiFormControlLabel-root': {
                      margin: '0 !important',
                      '& .MuiCheckbox-root': {
                        padding: '4px',
                      },
                      '& .MuiTypography-root': {
                        fontSize: '0.875rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'refraccion_dinamica')!)}
                  </Box>
                </Box>
                
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  transform: 'translateY(-60px)'
                }}>
                  <Box sx={{ 
                    '& .MuiFormControlLabel-root': {
                      margin: '0 !important',
                      '& .MuiCheckbox-root': {
                        padding: '4px',
                      },
                      '& .MuiTypography-root': {
                        fontSize: '0.875rem',
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'refraccion_estatica')!)}
                  </Box>
                </Box>
              </Box>

              {/* Right side - Reflejos */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                flex: 1
              }}>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1
                }}>
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Reflejos
                  </Typography>
                  
                  {/* Green Button */}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add sx={{ fontSize: '1rem', fontWeight: 'bold' }} />}
                    sx={{
                      backgroundColor: '#8BC34A',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#7CB342'
                      },
                      textTransform: 'none',
                      fontWeight: 500,
                      minWidth: '32px',
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      '& .MuiButton-startIcon': {
                        margin: 0
                      }
                    }}
                    onClick={handleOpenRefraccionModal}
                  >
                  </Button>
                </Box>
                
                <Box sx={{ 
                  '& .MuiTextField-root': {
                    margin: '0 !important',
                    width: '100%',
                    '& .MuiInputBase-root': {
                      height: '60px',
                      fontSize: '0.875rem',
                    }
                  }
                }}>
                  {renderField(fields.find(f => f.name === 'refraccion_reflejos')!)}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Second Row - Test's */}
      <Box sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        p: 2,
        width: '100%'
      }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          fontSize: '1rem',
          mb: 2,
          textAlign: 'left',
          color: '#000'
        }}>
          Test's
        </Typography>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2
        }}>
          {/* Vision Cromatica */}
          <Box>
            <Typography sx={{ 
              fontSize: '0.875rem',
              fontWeight: 500,
              mb: 1
            }}>
              Visión cromática AO: Normal
            </Typography>
            <Box sx={{ 
              '& .MuiTextField-root': {
                margin: '0 !important',
                width: '100%',
                '& .MuiInputBase-root': {
                  height: '40px',
                  fontSize: '0.875rem',
                }
              }
            }}>
              {renderField(fields.find(f => f.name === 'test_vision_cromatica_ao')!)}
            </Box>
          </Box>

          {/* Estereoscopia */}
          <Box>
            <Typography sx={{ 
              fontSize: '0.875rem',
              fontWeight: 500,
              mb: 1
            }}>
              Estereoscopia AO: Normal
            </Typography>
            <Box sx={{ 
              '& .MuiTextField-root': {
                margin: '0 !important',
                width: '100%',
                '& .MuiInputBase-root': {
                  height: '40px',
                  fontSize: '0.875rem',
                }
              }
            }}>
              {renderField(fields.find(f => f.name === 'test_estereoscopia_ao')!)}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default QueratometriaRefraccionSection; 