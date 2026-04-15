import React from 'react';
import { Box, Typography } from '@mui/material';
import { Save, CheckCircle, Sync } from '@mui/icons-material';
import { useAutoSaveIndicator } from '../hooks/useAutoSaveIndicator';

const AutoSaveIndicator: React.FC = () => {
  const { saveStatus, timeSinceLastSave, isAutoSaveEnabled, lastSaved } = useAutoSaveIndicator();

  if (!isAutoSaveEnabled) {
    return null;
  }

  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saved':
        return {
          icon: <CheckCircle sx={{ fontSize: 16 }} />,
          label: 'Guardado',
          color: 'success' as const,
          bgColor: '#d1fae5',
          textColor: '#065f46',
        };
      case 'saving':
        return {
          icon: <Sync sx={{ fontSize: 16 }} />,
          label: 'Guardando...',
          color: 'info' as const,
          bgColor: '#dbeafe',
          textColor: '#1e40af',
        };
      case 'unsaved':
        return {
          icon: <Save sx={{ fontSize: 16 }} />,
          label: 'Sin guardar',
          color: 'warning' as const,
          bgColor: '#fef3c7',
          textColor: '#92400e',
        };
      default:
        return {
          icon: <Save sx={{ fontSize: 16 }} />,
          label: 'Desconocido',
          color: 'default' as const,
          bgColor: '#f3f4f6',
          textColor: '#374151',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        backgroundColor: config.bgColor,
      }}
    >
      <Box sx={{ color: config.textColor, display: 'flex', alignItems: 'center' }}>
        {config.icon}
      </Box>
      <Box aria-label={`auto-save-status-${config.label}`}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: config.textColor,
            fontSize: '0.875rem' 
          }}
        >
          {config.label}
        </Typography>
        {timeSinceLastSave && saveStatus === 'saved' && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: config.textColor, 
              opacity: 0.8,
              fontSize: '0.75rem' 
            }}
          >
            {timeSinceLastSave}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AutoSaveIndicator;

