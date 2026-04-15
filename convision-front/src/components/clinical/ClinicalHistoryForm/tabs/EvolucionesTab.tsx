import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Print, Visibility, Add } from '@mui/icons-material';

const EvolucionesTab: React.FC = () => {
  const handleImprimir = () => {
    // Placeholder for print functionality
    console.log('Imprimir button clicked');
  };

  const handleVerTodas = () => {
    // Placeholder for view all functionality
    console.log('Ver todas button clicked');
  };

  const handleAgregar = () => {
    // Placeholder for add functionality
    console.log('Agregar button clicked');
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Paper 
        elevation={2}
        sx={{ 
          p: 3,
          bgcolor: 'white',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Main Content Area - White Background */}
        <Box 
          sx={{ 
            flex: 1,
            bgcolor: 'white', // White background like RxFinalTab
            borderRadius: 1,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            position: 'relative',
            minHeight: 400
          }}
        >
          {/* Print Button - Top Left */}
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handleImprimir}
            sx={{ 
              position: 'absolute',
              top: 16,
              left: 16,
              borderColor: '#9ca3af', // Soft gray border
              color: '#374151', // Dark gray text
              backgroundColor: '#f3f4f6', // Soft gray background
              '&:hover': {
                backgroundColor: '#e5e7eb',
                borderColor: '#6b7280'
              },
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            Imprimir
          </Button>
          
          {/* Content placeholder - could be empty or show some content */}
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#6b7280',
              fontSize: '1.1rem'
            }}
          >
            Área de contenido de evoluciones
          </Typography>
        </Box>

        {/* Footer with Action Buttons - White Background */}
        <Box 
          sx={{ 
            bgcolor: 'white', // White background like RxFinalTab
            borderRadius: 1,
            border: '1px solid #e2e8f0',
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            gap: 3
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={handleVerTodas}
            sx={{ 
              borderColor: '#3b82f6', // Soft blue border
              color: '#1e40af', // Dark blue text
              backgroundColor: '#dbeafe', // Soft blue background
              '&:hover': {
                backgroundColor: '#bfdbfe',
                borderColor: '#2563eb'
              },
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Ver todas
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAgregar}
            sx={{ 
              borderColor: '#10b981', // Soft green border
              color: '#047857', // Dark green text
              backgroundColor: '#d1fae5', // Soft green background
              '&:hover': {
                backgroundColor: '#a7f3d0',
                borderColor: '#059669'
              },
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Agregar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default EvolucionesTab;
