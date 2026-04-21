import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface VademecumItem {
  id: string;
  nombre: string;
}

interface VademecumModalProps {
  onClose: () => void;
  onSelectExamen: (examen: VademecumItem) => void;
}

const VademecumModal: React.FC<VademecumModalProps> = ({
  onClose,
  onSelectExamen
}) => {
  // Filter state
  const [filters, setFilters] = useState({
    nombre: ''
  });

  // Selected examen state
  const [selectedExamen, setSelectedExamen] = useState<VademecumItem | null>(null);

  // Mock vademecum data based on the image
  const [vademecumData] = useState<VademecumItem[]>([
    { id: '1', nombre: 'RECUENTO ENDOTELIAL' },
    { id: '2', nombre: 'TOMOGRAFIA OPTICA COHERENTE - OCT de Segmento Anterior' },
    { id: '3', nombre: 'TOMOGRAFIA OPTICA COHERENTE - OCT de Retina' },
    { id: '4', nombre: 'TOMOGRAFIA OPTICA COHERENTE - OCT de Glaucoma' },
    { id: '5', nombre: 'PENTACAM' },
    { id: '6', nombre: 'PENTACAM - CALCULO BIOMETRICO' },
    { id: '7', nombre: 'PENTACAM - ESTUDIO PAQUIMETRICO' },
    { id: '8', nombre: 'ELECTRORETINOGRAMA Y ELECTROOCULOGRAMA' },
    { id: '9', nombre: 'FOTOGRAFIAS DE CARA, FRENTE Y PERFIL' },
    { id: '10', nombre: 'FOTOGRAFÍA DE POLO POSTERIOR' },
    { id: '11', nombre: 'BIOMETRIA OCULAR' },
    { id: '12', nombre: 'TIEMPO DE PROTROMBINA (TP)' },
    { id: '13', nombre: 'PENTACAM - CALCULO BIOMETRICO' },
    { id: '14', nombre: 'CAMPIMETRIA COMPUTARIZADA' },
    { id: '15', nombre: 'TOPOGRAFIA CORNEAL' },
    { id: '16', nombre: 'PAQUIMETRIA ULTRASONICA' },
    { id: '17', nombre: 'GONIOSCOPIA' },
    { id: '18', nombre: 'FUNDOSCOPIA INDIRECTA' },
    { id: '19', nombre: 'TONOMETRIA DE APLANACION' },
    { id: '20', nombre: 'REFRACTOMETRIA AUTOMATICA' }
  ]);

  // Filter vademecum data based on current filters
  const filteredVademecumData = vademecumData.filter(item => {
    const matchesText = 
      item.nombre.toLowerCase().includes(filters.nombre.toLowerCase());
    return matchesText;
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExamenSelect = (examen: VademecumItem) => {
    if (selectedExamen?.id === examen.id) {
      // Deselect if already selected
      setSelectedExamen(null);
    } else {
      setSelectedExamen(examen);
    }
  };

  const handleSelectExamen = () => {
    if (selectedExamen) {
      onSelectExamen(selectedExamen);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <Box 
      onClick={onClose}
      sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Box 
        onClick={(e) => e.stopPropagation()}
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '1200px',
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          height: '90vh',
          maxHeight: '90vh',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
      {/* Header with close button */}
      <Box sx={{ 
        p: 3, 
        backgroundColor: '#f8fafc', 
        borderBottom: '2px solid #e2e8f0', 
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          textAlign: 'center',
          color: '#1e293b',
          fontSize: '1.25rem',
          flex: 1
        }}>
          AdicionarVademecum
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#64748b',
            '&:hover': {
              backgroundColor: 'rgba(100, 116, 139, 0.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Content Container */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: 3,
        flex: 1,
        backgroundColor: '#f8fafc',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Filter Section */}
        <Box sx={{ 
          p: 2,
          borderRadius: 1,
          display: 'flex',
          gap: 3
        }}>
          {/* Filter Field */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mb: 0.25, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Nombre
              </Typography>
              <TextField
                size="small"
                value={filters.nombre}
                onChange={(e) => handleFilterChange('nombre', e.target.value)}
                sx={{ 
                  backgroundColor: 'white',
                  '& .MuiInputBase-root': {
                    fontSize: '0.75rem',
                    height: '32px'
                  }
                }}
                fullWidth
              />
            </Box>
          </Box>
        </Box>

        {/* Table Section */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          <TableContainer component={Paper} sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            flex: 1,
            overflow: 'auto',
            minHeight: 0
          }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Seleccionar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVademecumData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} sx={{ textAlign: 'center', py: 2, color: '#666' }}>
                      No se encontraron exámenes que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVademecumData.map((examen) => (
                    <TableRow 
                      key={examen.id}
                      hover
                      selected={selectedExamen?.id === examen.id}
                      onClick={() => handleExamenSelect(examen)}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedExamen?.id === examen.id ? '#e3f2fd' : 'inherit',
                        '&:hover': {
                          backgroundColor: selectedExamen?.id === examen.id ? '#e3f2fd' : '#f5f5f5'
                        }
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.875rem' }}>{examen.nombre}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          variant={selectedExamen?.id === examen.id ? "outlined" : "contained"}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExamenSelect(examen);
                          }}
                          sx={{
                            minWidth: '100px',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            ...(selectedExamen?.id === examen.id ? {
                              borderColor: '#d32f2f',
                              color: '#d32f2f',
                              '&:hover': {
                                borderColor: '#b71c1c',
                                backgroundColor: 'rgba(211, 47, 47, 0.1)'
                              }
                            } : {
                              backgroundColor: '#2B5797',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: '#1e3f6f'
                              }
                            })
                          }}
                        >
                          {selectedExamen?.id === examen.id ? 'Remover' : 'Seleccionar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
          onClick={onClose}
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
          Cerrar
        </Button>
        
        <Button
          variant="contained"
          onClick={handleSelectExamen}
          disabled={!selectedExamen}
          sx={{
            backgroundColor: selectedExamen ? '#2B5797' : '#cccccc',
            color: 'white',
            minWidth: '120px',
            '&:hover': {
              backgroundColor: selectedExamen ? '#1e3f6f' : '#cccccc'
            },
            '&:disabled': {
              backgroundColor: '#cccccc',
              color: '#999999'
            },
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Seleccionar
        </Button>
      </Box>
      </Box>
    </Box>
  );
};

export default VademecumModal;
