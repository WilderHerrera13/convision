import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box 
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';

interface UnsavedChangesWarningProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({
  open,
  onConfirm,
  onCancel,
  title = "Cambios sin guardar",
  message = "Los cambios actuales no han sido guardados. ¿Está seguro de que desea continuar? Se perderán todos los cambios realizados."
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      sx={{
        zIndex: 10000,
        '& .MuiDialog-paper': {
          borderRadius: 2,
          backgroundColor: '#f8fafc'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        backgroundColor: '#f8fafc',
        color: '#1e293b',
        fontWeight: 600
      }}>
        <WarningAmber sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
        {title}
      </DialogTitle>
      
      <DialogContent sx={{ backgroundColor: '#f8fafc' }}>
        <Typography sx={{ 
          color: '#475569', 
          fontSize: '0.9rem',
          lineHeight: 1.5
        }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        backgroundColor: '#f8fafc',
        gap: 2 
      }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            borderColor: '#64748b',
            color: '#64748b',
            '&:hover': {
              borderColor: '#475569',
              backgroundColor: 'rgba(100, 116, 139, 0.1)'
            },
            textTransform: 'none',
            fontWeight: 600,
            minWidth: '100px'
          }}
        >
          Mantener cambios
        </Button>
        
        <Button
          variant="contained"
          onClick={onConfirm}
          sx={{
            backgroundColor: '#dc2626',
            color: 'white',
            '&:hover': {
              backgroundColor: '#b91c1c'
            },
            textTransform: 'none',
            fontWeight: 600,
            minWidth: '100px'
          }}
        >
          Descartar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsavedChangesWarning;
