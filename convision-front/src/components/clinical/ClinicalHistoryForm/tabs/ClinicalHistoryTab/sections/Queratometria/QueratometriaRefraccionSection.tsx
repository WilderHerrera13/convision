import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Chip } from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import { SectionProps, FieldDefinition } from '../../types';
import RefraccionModal from './RefraccionModal';
import TestModal from './TestModal';

interface RefraccionData {
  id: string;
  data: { [key: string]: string | boolean };
  timestamp: string;
}

interface TestData {
  id: string;
  data: { [key: string]: string | boolean };
  timestamp: string;
}

const QueratometriaRefraccionSection: React.FC<SectionProps> = ({ form, serverErrors, renderField, onModalOpen, onModalClose, isModalActive }) => {
  const [showRefraccionModal, setShowRefraccionModal] = useState(false);
  const [savedRefraccionData, setSavedRefraccionData] = useState<RefraccionData | null>(null);
  const [editingRefraccionId, setEditingRefraccionId] = useState<string | null>(null);

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [savedTestData, setSavedTestData] = useState<TestData | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Handle modal reopening from parent component
  useEffect(() => {
    if (isModalActive) {
      // Determine which modal was last opened based on saved data
      if (savedRefraccionData && !savedTestData) {
        handleOpenRefraccionModal();
      } else if (savedTestData && !savedRefraccionData) {
        handleOpenTestModal();
      } else if (savedRefraccionData && savedTestData) {
        // If both have data, open the most recent one
        const refraccionTime = new Date(savedRefraccionData.timestamp).getTime();
        const testTime = new Date(savedTestData.timestamp).getTime();
        if (refraccionTime > testTime) {
          handleOpenRefraccionModal();
        } else {
          handleOpenTestModal();
        }
      }
    }
  }, [isModalActive]);

  // Initialize default values for Horizontal, Vertical, Eje, and Refraccion fields
  useEffect(() => {
    const defaultFields = {
      'queratometria_od_horizontal': '0.00',
      'queratometria_od_vertical': '0.00',
      'queratometria_oi_horizontal': '0.00',
      'queratometria_oi_vertical': '0.00',
      'queratometria_od_eje': '0.0',
      'queratometria_oi_eje': '0.0',
      'queratometria_od_dif': '0.00',
      'queratometria_oi_dif': '0.00',
      // Afiliacion and Miras default values
      'queratometria_afiliacion_od': '0.00',
      'queratometria_afiliacion_oi': '0.00',
      'queratometria_miras_od': '0.00',
      'queratometria_miras_oi': '0.00',
      // Refraccion default values
      'refraccion_od_esfera': '0.0',
      'refraccion_od_cilindro': '0.0',
      'refraccion_od_eje': '0.0',
      'refraccion_od_adicion': '0.0',
      'refraccion_oi_esfera': '0.0',
      'refraccion_oi_cilindro': '0.0',
      'refraccion_oi_eje': '0.0',
      'refraccion_oi_adicion': '0.0',
    };

    Object.entries(defaultFields).forEach(([fieldName, defaultValue]) => {
      const currentValue = form.getValues(fieldName as any);
      if (!currentValue || currentValue === '') {
        form.setValue(fieldName as any, defaultValue);
      }
    });
  }, [form]);

  // Calculate difference when horizontal or vertical values change
  useEffect(() => {
    // Calculate initial differences for both OD and OI
    const calculateDifference = (prefix: string) => {
      const horizontalValue = parseFloat(form.getValues(`${prefix}_horizontal` as any) || '0');
      const verticalValue = parseFloat(form.getValues(`${prefix}_vertical` as any) || '0');
      const difference = Math.abs(horizontalValue - verticalValue);
      form.setValue(`${prefix}_dif` as any, difference.toFixed(2));
    };

    // Calculate initial differences
    calculateDifference('queratometria_od');
    calculateDifference('queratometria_oi');

    // Watch for changes and recalculate
    const subscription = form.watch((value, { name }) => {
      if (name && (name.includes('_horizontal') || name.includes('_vertical'))) {
        const isOD = name.includes('_od_');
        const prefix = isOD ? 'queratometria_od' : 'queratometria_oi';
        
        const horizontalValue = parseFloat(form.getValues(`${prefix}_horizontal` as any) || '0');
        const verticalValue = parseFloat(form.getValues(`${prefix}_vertical` as any) || '0');
        
        const difference = Math.abs(horizontalValue - verticalValue);
        form.setValue(`${prefix}_dif` as any, difference.toFixed(2));
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Handle mutually exclusive checkboxes for Dinamica and Estatica
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name as string) === 'refraccion_dinamica' && (value as any).refraccion_dinamica) {
        form.setValue('refraccion_estatica' as any, false);
      } else if ((name as string) === 'refraccion_estatica' && (value as any).refraccion_estatica) {
        form.setValue('refraccion_dinamica' as any, false);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Format decimal value
  const formatDecimalValue = (value: string): string => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d]/g, '');
    
    // If empty, return empty string
    if (!numericValue) return '';
    
    // Convert to number and format with 2 decimal places
    const number = parseInt(numericValue, 10);
    return (number / 100).toFixed(2);
  };

  // Custom field renderer for special decimal fields
  const renderDecimalField = (fieldName: string, placeholder?: string) => {
    const error = form.formState.errors[fieldName as keyof typeof form.formState.errors];
    const hasError = !!error || !!serverErrors[fieldName];

    return (
      <TextField
        {...form.register(fieldName as any)}
        placeholder={placeholder || "0.00"}
        error={hasError}
        size="small"
        fullWidth
        onFocus={(e) => {
          const target = e.target as HTMLInputElement;
          const currentValue = target.value;
          // If the value is the default "0.00", select all text for easy override
          if (currentValue === '0.00' || currentValue === '0.0') {
            setTimeout(() => {
              target.select();
            }, 0);
          }
        }}
        onBlur={(e) => {
          const formattedValue = formatDecimalValue(e.target.value);
          form.setValue(fieldName as any, formattedValue);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab' || e.key === 'Enter') {
            const target = e.currentTarget as HTMLInputElement;
            const formattedValue = formatDecimalValue(target.value);
            form.setValue(fieldName as any, formattedValue);
          }
        }}
        sx={{ 
          bgcolor: 'white',
          '& .MuiInputBase-root': {
            height: '32px', // Reduced by 20% from ~40px
            fontSize: '0.875rem', // Standard size
            padding: '6px 8px' // Ensure proper padding for placeholder
          }
        }}
      />
    );
  };

  // Custom field renderer for Eje fields (single decimal)
  const renderEjeField = (fieldName: string) => {
    const error = form.formState.errors[fieldName as keyof typeof form.formState.errors];
    const hasError = !!error || !!serverErrors[fieldName];

    return (
      <TextField
        {...form.register(fieldName as any)}
        placeholder="0.0"
        error={hasError}
        size="small"
        fullWidth
        onFocus={(e) => {
          const target = e.target as HTMLInputElement;
          const currentValue = target.value;
          // If the value is the default "0.0", select all text for easy override
          if (currentValue === '0.0') {
            setTimeout(() => {
              target.select();
            }, 0);
          }
        }}
        sx={{ 
          bgcolor: 'white',
          '& .MuiInputBase-root': {
            height: '32px', // Reduced by 20% from ~40px
            fontSize: '0.875rem', // Standard size
            padding: '6px 8px' // Ensure proper padding for placeholder
          }
        }}
      />
    );
  };

  // Custom field renderer for read-only Dif fields
  const renderDifField = (fieldName: string) => {
    return (
      <TextField
        {...form.register(fieldName as any)}
        disabled
        size="small"
        fullWidth
        sx={{ 
          bgcolor: 'white',
          '& .MuiInputBase-root': {
            height: '32px', // Reduced by 20% from ~40px
            fontSize: '0.875rem', // Standard size
            padding: '6px 8px' // Ensure proper padding for placeholder
          }
        }}
      />
    );
  };

  // Custom field renderer for Refraccion fields (similar to Eje fields)
  const renderRefraccionField = (fieldName: string) => {
    const error = form.formState.errors[fieldName as keyof typeof form.formState.errors];
    const hasError = !!error || !!serverErrors[fieldName];

    return (
      <TextField
        {...form.register(fieldName as any)}
        placeholder="0.0"
        error={hasError}
        size="small"
        fullWidth
        onFocus={(e) => {
          const target = e.target as HTMLInputElement;
          const currentValue = target.value;
          // If the value is the default "0.0", select all text for easy override
          if (currentValue === '0.0') {
            setTimeout(() => {
              target.select();
            }, 0);
          }
        }}
        sx={{ 
          bgcolor: 'white',
          '& .MuiInputBase-root': {
            height: '32px', // Reduced by 20% from ~40px
            fontSize: '0.875rem', // Standard size
            padding: '6px 8px' // Ensure proper padding for placeholder
          }
        }}
      />
    );
  };

  const handleOpenRefraccionModal = () => {
    // If there's saved data, we're editing it
    if (savedRefraccionData) {
      setEditingRefraccionId(savedRefraccionData.id);
    } else {
      setEditingRefraccionId(null);
    }
    setShowRefraccionModal(true);
    onModalOpen?.('refraccion', 'refraccion-button');
    
    // Reset scroll position to top when modal opens
    setTimeout(() => {
      const modalContainer = document.querySelector('[data-modal="refraccion"]');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }, 100);
  };

  const handleCloseRefraccionModal = () => {
    setShowRefraccionModal(false);
    setEditingRefraccionId(null);
    onModalClose?.();
  };

  const handleSaveRefraccion = (refraccionData: { [key: string]: string | boolean }) => {
    const timestamp = new Date().toLocaleString();
    
    // Always update the single saved item or create new one
    const savedEntry: RefraccionData = {
      id: savedRefraccionData?.id || `refraccion_${Date.now()}`,
      data: refraccionData,
      timestamp
    };
    setSavedRefraccionData(savedEntry);
    
    setShowRefraccionModal(false);
    setEditingRefraccionId(null);
  };

  const getCurrentRefraccionData = () => {
    if (savedRefraccionData && editingRefraccionId) {
      return savedRefraccionData.data || {};
    }
    return {};
  };

  // Test modal handlers
  const handleOpenTestModal = () => {
    // If there's saved data, we're editing it
    if (savedTestData) {
      setEditingTestId(savedTestData.id);
    } else {
      setEditingTestId(null);
    }
    setShowTestModal(true);
    onModalOpen?.('test', 'test-button');
    
    // Reset scroll position to top when modal opens
    setTimeout(() => {
      const modalContainer = document.querySelector('[data-modal="test"]');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }, 100);
  };

  const handleCloseTestModal = () => {
    setShowTestModal(false);
    setEditingTestId(null);
    onModalClose?.();
  };

  const handleSaveTest = (testData: { [key: string]: string | boolean }) => {
    const timestamp = new Date().toLocaleString();
    
    // Always update the single saved item or create new one
    const savedEntry: TestData = {
      id: savedTestData?.id || `test_${Date.now()}`,
      data: testData,
      timestamp
    };
    setSavedTestData(savedEntry);
    
    setShowTestModal(false);
    setEditingTestId(null);
  };

  const getCurrentTestData = () => {
    if (savedTestData && editingTestId) {
      return savedTestData.data || {};
    }
    return {};
  };

  // If a modal is active, show only the modal content
  if (showRefraccionModal || showTestModal) {
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
          data-modal={showRefraccionModal ? 'refraccion' : 'test'}
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
          {showRefraccionModal && (
            <RefraccionModal
              form={form}
              serverErrors={serverErrors}
              renderField={renderField}
              onSave={handleSaveRefraccion}
              onCancel={handleCloseRefraccionModal}
              initialData={getCurrentRefraccionData()}
              isEditing={!!editingRefraccionId}
            />
          )}
          {showTestModal && (
            <TestModal
              form={form}
              serverErrors={serverErrors}
              renderField={renderField}
              onSave={handleSaveTest}
              onCancel={handleCloseTestModal}
              initialData={getCurrentTestData()}
              isEditing={!!editingTestId}
            />
          )}
        </Box>
      </Box>
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

    // Afiliacion and Miras fields
    { 
      name: "queratometria_afiliacion_od", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_afiliacion_oi", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_miras_od", 
      label: "", 
      type: "text",
      placeholder: ""
    },
    { 
      name: "queratometria_miras_oi", 
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
      {/* First Row - Queratometria, Refraccion, and Test's side by side */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1, // Reduced gap to save space
        width: '100%',
        alignItems: 'flex-start', // Align sections to top
        overflow: 'hidden' // Prevent container overflow
      }}>
        {/* Queratometria Section */}
        <Box sx={{ 
          flex: '2 1 0', // 2/5 of the width
          minWidth: 0,
          maxWidth: '40%', // Ensure it doesn't exceed its allocation
          overflow: 'hidden', // Prevent overflow
          boxSizing: 'border-box',
          pr: 2
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            fontSize: '1rem',
            mb: 2,
            color: '#1e293b'
          }}>
            Queratometria
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Main keratometry data */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Headers */}
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5, // Reduced gap
                mb: 0.5
              }}>
                <Box sx={{ flex: '0 0 50px' }}></Box>
                {['Horizontal', 'Vertical', 'Eje', 'Dif'].map((header) => (
                  <Box key={header} sx={{ flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', color: '#374151', fontSize: '0.75rem' }}>
                      {header}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* OD Row */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                <Box sx={{ flex: '0 0 50px', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                    OD
                  </Typography>
                </Box>
                {[
                  { field: 'queratometria_od_horizontal', renderer: renderDecimalField },
                  { field: 'queratometria_od_vertical', renderer: renderDecimalField },
                  { field: 'queratometria_od_eje', renderer: renderEjeField },
                  { field: 'queratometria_od_dif', renderer: renderDifField }
                ].map((input) => (
                  <Box key={input.field} sx={{ flex: '1 1 0' }}>
                    {input.renderer(input.field)}
                  </Box>
                ))}
              </Box>

              {/* OI Row */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Box sx={{ flex: '0 0 50px', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                    OI
                  </Typography>
                </Box>
                {[
                  { field: 'queratometria_oi_horizontal', renderer: renderDecimalField },
                  { field: 'queratometria_oi_vertical', renderer: renderDecimalField },
                  { field: 'queratometria_oi_eje', renderer: renderEjeField },
                  { field: 'queratometria_oi_dif', renderer: renderDifField }
                ].map((input) => (
                  <Box key={input.field} sx={{ flex: '1 1 0' }}>
                    {input.renderer(input.field)}
                  </Box>
                ))}
              </Box>
        
            </Box>

            {/* Presion Intraocular and Miras Section */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: 1,
              mt: 2,
              p: 1,
              backgroundColor: '#f9f9f9',
              alignItems: 'center'
            }}>
              {/* Presion Intraocular */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.5,
                flex: '0 0 auto',
                minWidth: '80px'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem', textAlign: 'center' }}>
                Presion Intraocular
                </Typography>
              </Box>

              {/* OD/OI with input fields and mmHg Item */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.5,
                flex: '1 1 0',
                minWidth: '140px'
              }}>
                {/* OD Row */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Box sx={{ flex: '0 0 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                      OD
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 0' }}>
                    {renderDecimalField('queratometria_afiliacion_od')}
                  </Box>
                  <Box sx={{ flex: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                      mmHg
                    </Typography>
                  </Box>
                </Box>

                {/* OI Row */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Box sx={{ flex: '0 0 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                      OI
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 0' }}>
                    {renderDecimalField('queratometria_afiliacion_oi')}
                  </Box>
                  <Box sx={{ flex: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}>
                      mmHg
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Miras Item */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.5,
                flex: '0 0 auto',
                minWidth: '50px',
                alignItems: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem', textAlign: 'center' }}>
                  Miras
                </Typography>
              </Box>

              {/* Last two input fields Item */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                gap: 0.5,
                flex: '1 1 0',
                minWidth: '122px'
              }}>
                {/* OD Miras Row */}
                <Box sx={{ display: 'flex', gap: 0.5}}>
                  <Box sx={{ flex: '1 1 0' }}>
                    {renderDecimalField('queratometria_miras_od')}
                  </Box>
                  <Box sx={{ flex: '0 0 55px' }}></Box>
                </Box>

                {/* OI Miras Row */}
                <Box sx={{ display: 'flex', gap: 0.5}}>
                  <Box sx={{ flex: '1 1 0' }}>
                    {renderDecimalField('queratometria_miras_oi')}
                  </Box>
                  <Box sx={{ flex: '0 0 55px' }}></Box>
                </Box>
              </Box>
            </Box>

          </Box>
        </Box>

        {/* Refraccion Section */}
        <Box sx={{ 
          flex: '2 1 0', // 2/5 of the width
          minWidth: 0,
          maxWidth: '40%', // Ensure it doesn't exceed its allocation
          overflow: 'hidden', // Prevent overflow
          boxSizing: 'border-box',
          borderLeft: '1px solid #e0e0e0',
          borderRight: '1px solid #e0e0e0',
          px: 2
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            fontSize: '1rem',
            mb: 2,
            color: '#1e293b'
          }}>
            Refraccion
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* Reduced gap */}
            {/* Main refraccion data */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* Reduced gap */}
              {/* Headers */}
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5, // Reduced gap
                mb: 0.5 // Reduced margin
              }}>
                <Box sx={{ flex: '0 0 50px' }}></Box> {/* Reduced width */}
                {['Esfera', 'Cilindro', 'Eje', 'Adición'].map((header) => (
                  <Box key={header} sx={{ flex: '1 1 0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', color: '#374151', fontSize: '0.75rem' }}> {/* Reduced font size */}
                      {header}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* OD Row */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}> {/* Reduced gaps */}
                <Box sx={{ flex: '0 0 50px', display: 'flex', alignItems: 'center' }}> {/* Reduced width */}
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}> {/* Reduced font size */}
                    OD
                  </Typography>
                </Box>
                {[
                  { field: 'refraccion_od_esfera', renderer: renderRefraccionField },
                  { field: 'refraccion_od_cilindro', renderer: renderRefraccionField },
                  { field: 'refraccion_od_eje', renderer: renderRefraccionField },
                  { field: 'refraccion_od_adicion', renderer: renderRefraccionField }
                ].map((input) => (
                  <Box key={input.field} sx={{ flex: '1 1 0' }}>
                    {input.renderer(input.field)}
                  </Box>
                ))}
              </Box>

              {/* OI Row */}
              <Box sx={{ display: 'flex', gap: 0.5 }}> {/* Reduced gap */}
                <Box sx={{ flex: '0 0 50px', display: 'flex', alignItems: 'center' }}> {/* Reduced width */}
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: '0.75rem' }}> {/* Reduced font size */}
                    OI
                  </Typography>
                </Box>
                {[
                  { field: 'refraccion_oi_esfera', renderer: renderRefraccionField },
                  { field: 'refraccion_oi_cilindro', renderer: renderRefraccionField },
                  { field: 'refraccion_oi_eje', renderer: renderRefraccionField },
                  { field: 'refraccion_oi_adicion', renderer: renderRefraccionField }
                ].map((input) => (
                  <Box key={input.field} sx={{ flex: '1 1 0' }}>
                    {input.renderer(input.field)}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Bottom section - Reflejos and Modificar+History */}
            <Box sx={{ 
              display: 'flex',
              gap: 3,
              alignItems: 'center',
              justifyContent: 'center',
              mt: 2
            }}>
              {/* Reflejos section with checkboxes above */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5 // Reduced gap
              }}>
                {/* Checkboxes above Reflejos */}
                <Box sx={{ 
                  display: 'flex',
                  gap: 1, // Reduced gap
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  mb: 0.5 // Reduced margin
                }}>
                  <Box sx={{ 
                    '& .MuiFormControlLabel-root': {
                      margin: '0 !important',
                      '& .MuiCheckbox-root': {
                        padding: '3px', // Reduced padding
                        margin: 0,
                        transform: 'scale(0.8)', // 20% smaller
                      },
                      '& .MuiTypography-root': {
                        fontSize: '0.7rem', // Reduced by 20%
                        margin: 0,
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'refraccion_dinamica')!)}
                  </Box>
                  
                  <Box sx={{ 
                    '& .MuiFormControlLabel-root': {
                      margin: '0 !important',
                      '& .MuiCheckbox-root': {
                        padding: '3px', // Reduced padding
                        margin: 0,
                        transform: 'scale(0.8)', // 20% smaller
                      },
                      '& .MuiTypography-root': {
                        fontSize: '0.7rem', // Reduced by 20%
                        margin: 0,
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'refraccion_estatica')!)}
                  </Box>
                </Box>

                {/* Reflejos with inline label */}
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5 // Reduced gap
                }}>
                  <Typography sx={{ 
                    fontSize: '0.7rem', // Reduced by 20%
                    fontWeight: 700,
                    minWidth: '48px', // Reduced by 20%
                    mt: 2.5 // Reduced margin
                  }}>
                    Reflejos
                  </Typography>
                  
                  <Box sx={{ 
                    flex: 1,
                    '& .MuiTextField-root': {
                      margin: '0 !important',
                      width: '100%',
                      '& .MuiInputBase-root': {
                        height: '48px', // Reduced by 20%
                        fontSize: '0.7rem', // Reduced by 20%
                        alignItems: 'flex-start',
                        '& textarea': {
                          resize: 'vertical'
                        }
                      }
                    }
                  }}>
                    {renderField(fields.find(f => f.name === 'refraccion_reflejos')!)}
                  </Box>
                </Box>
              </Box>

              {/* Modificar Button + History */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5, // Reduced gap
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Green Button */}
                <Button
                  variant="contained"
                  startIcon={savedRefraccionData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
                  sx={{
                    backgroundColor: '#8BC34A',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#7CB342'
                    },
                    textTransform: 'none',
                    fontWeight: 500,
                    width: '160px', // Reduced by 20%
                    height: '32px', // Reduced height
                    fontSize: '0.875rem' // Standard size
                  }}
                  onClick={handleOpenRefraccionModal}
                >
                  {savedRefraccionData ? 'Modificar' : ''}
                </Button>

                {/* History container - shows saved refraccion entry */}
                <Box sx={{ 
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  p: 0.5, // Reduced padding
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5, // Reduced gap
                  minHeight: '64px', // Reduced by 20%
                  width: '160px' // Reduced by 20%
                }}>
                  {/* Show saved refraccion entry */}
                  {savedRefraccionData && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip
                        label={`Refracción - ${savedRefraccionData.timestamp}`}
                        onClick={() => {
                          setEditingRefraccionId(savedRefraccionData.id);
                          setShowRefraccionModal(true);
                        }}
                        onDelete={() => {
                          setSavedRefraccionData(null);
                          setEditingRefraccionId(null);
                        }}
                        icon={<Edit />}
                        size="small"
                        sx={{
                          justifyContent: 'flex-start',
                          backgroundColor: '#f3e5f5',
                          color: '#7b1fa2',
                          '&:hover': {
                            backgroundColor: '#e1bee7',
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

        {/* Test's Section */}
        <Box sx={{ 
          flex: '1 1 0', // 1/5 of the width
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: '20%', // Ensure it doesn't exceed its allocation
          overflow: 'hidden', // Prevent overflow
          boxSizing: 'border-box',
          pl: 2
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            fontSize: '1rem',
            mb: 2,
            color: '#1e293b'
          }}>
            Test's
          </Typography>
          
          {/* Add Test Button */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            mb: 1,
            mt: 2
          }}>
            <Button
              variant="contained"
              startIcon={savedTestData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
              sx={{
                backgroundColor: '#8BC34A',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#7CB342'
                },
                textTransform: 'none',
                fontWeight: 500,
                width: '100%',
                maxWidth: 'none'
              }}
              onClick={handleOpenTestModal}
            >
              {savedTestData ? 'Modificar' : ''}
            </Button>
          </Box>

          {/* History boxes side by side */}
          <Box sx={{ 
            display: 'flex',
            gap: 1,
            minWidth: 0
          }}>
          {/* First History Box */}
          <Box sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1,
            backgroundColor: 'white',
            flex: 1,
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 0
            }}>
            {/* Show saved test entry */}
            {savedTestData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Chip
                  label={`Test - ${savedTestData.timestamp}`}
                  onClick={() => {
                    setEditingTestId(savedTestData.id);
                    setShowTestModal(true);
                  }}
                  onDelete={() => {
                    setSavedTestData(null);
                    setEditingTestId(null);
                  }}
                  icon={<Edit />}
                  size="small"
                  sx={{
                    justifyContent: 'flex-start',
                    backgroundColor: '#f3e5f5',
                    color: '#7b1fa2',
                    '&:hover': {
                      backgroundColor: '#e1bee7',
                    },
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Second History Box - Same content */}
          <Box sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 1,
            backgroundColor: 'white',
            flex: 1,
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 0
          }}>
            {/* Show saved test entry */}
            {savedTestData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Chip
                  label={`Test - ${savedTestData.timestamp}`}
                  onClick={() => {
                    setEditingTestId(savedTestData.id);
                    setShowTestModal(true);
                  }}
                  onDelete={() => {
                    setSavedTestData(null);
                    setEditingTestId(null);
                  }}
                  icon={<Edit />}
                  size="small"
                  sx={{
                    justifyContent: 'flex-start',
                    backgroundColor: '#f3e5f5',
                    color: '#7b1fa2',
                    '&:hover': {
                      backgroundColor: '#e1bee7',
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
  );
};

export default QueratometriaRefraccionSection; 