import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Tabs,
  Tab
} from '@mui/material';
import { FolderOpen, Delete, Print, CloudUpload, Add, Gesture } from '@mui/icons-material';

// Bordered Section Component (simplified version without status indicators)
interface BorderedSectionProps {
  title: string;
  children: React.ReactNode;
}

const BorderedSection: React.FC<BorderedSectionProps> = ({ 
  title, 
  children 
}) => {
  return (
    <Box
      component="fieldset"
      sx={{
        border: '2px solid #e2e8f0',
        borderRadius: 2,
        bgcolor: 'white',
        p: 3,
        m: 0,
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderColor: '#cbd5e1'
        }
      }}
    >
      <Box
        component="legend"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.5,
          bgcolor: 'white',
          borderRadius: 1,
          border: '1px solid #e2e8f0',
          color: '#1e293b',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ 
          width: 3, 
          height: 12, 
          bgcolor: '#6b7280', 
          borderRadius: 1 
        }} />
        
        <Typography variant="body2" sx={{ 
          fontWeight: 600, 
          color: '#1e293b',
          fontSize: '0.875rem'
        }}>
          {title}
        </Typography>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        {children}
      </Box>
    </Box>
  );
};

const DocumentosTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAbrir = () => {
    console.log('Abrir clicked');
  };

  const handleEliminar = () => {
    console.log('Eliminar clicked');
  };

  const handleImprimir = () => {
    console.log('Imprimir clicked');
  };

  const handleFirmar = () => {
    console.log('Firmar clicked');
  };

  const handleCargarTodos = () => {
    console.log('Cargar Todos clicked');
  };

  const handleAgregar = () => {
    console.log('Agregar clicked');
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Section 1: Document Tabs */}
        <BorderedSection title="Gestión de Documentos">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              mb: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                color: '#6b7280',
                '&.Mui-selected': {
                  color: '#3b82f6'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6'
              }
            }}
          >
            <Tab label="Archivos" />
            <Tab label="Consentimientos" />
            <Tab label="Certificados" />
          </Tabs>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Box>
              {/* Archivos Tab Content */}
              <Box sx={{ 
                minHeight: 300, 
                bgcolor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Área de contenido de archivos
                </Typography>
              </Box>
              
              {/* Action Buttons for Archivos */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<FolderOpen />}
                  onClick={handleAbrir}
                  sx={{ 
                    borderColor: '#d1d5db',
                    color: '#374151',
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                      borderColor: '#9ca3af'
                    },
                    fontWeight: 600
                  }}
                >
                  Abrir
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Delete />}
                  onClick={handleEliminar}
                  sx={{ 
                    borderColor: '#fecaca',
                    color: '#dc2626',
                    '&:hover': {
                      backgroundColor: '#fef2f2',
                      borderColor: '#f87171'
                    },
                    fontWeight: 600
                  }}
                >
                  Eliminar
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              {/* Consentimientos Tab Content */}
              <Box sx={{ 
                minHeight: 300, 
                bgcolor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Área de contenido de consentimientos
                </Typography>
              </Box>
              
              {/* Action Buttons for Consentimientos */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Gesture />}
                  onClick={handleFirmar}
                  sx={{ 
                    borderColor: '#d1d5db',
                    color: '#374151',
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                      borderColor: '#9ca3af'
                    },
                    fontWeight: 600
                  }}
                >
                  Firmar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleImprimir}
                  sx={{ 
                    borderColor: '#d1d5db',
                    color: '#374151',
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                      borderColor: '#9ca3af'
                    },
                    fontWeight: 600
                  }}
                >
                  Imprimir
                </Button>
              </Box>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              {/* Certificados Tab Content */}
              <Box sx={{ 
                minHeight: 300, 
                bgcolor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                  Área de contenido de certificados
                </Typography>
              </Box>
              
              {/* Action Button for Certificados */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleImprimir}
                  sx={{ 
                    borderColor: '#d1d5db',
                    color: '#374151',
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                      borderColor: '#9ca3af'
                    },
                    fontWeight: 600
                  }}
                >
                  Imprimir
                </Button>
              </Box>
            </Box>
          )}
        </BorderedSection>

        {/* Section 2: Footer Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={handleCargarTodos}
            sx={{ 
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#9ca3af'
              },
              fontWeight: 600
            }}
          >
            Cargar Todos
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAgregar}
            sx={{ 
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#9ca3af'
              },
              fontWeight: 600
            }}
          >
            Agregar
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default DocumentosTab;
