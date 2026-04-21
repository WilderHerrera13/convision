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

interface CupsItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface CupsModalProps {
  onClose: () => void;
  onSelectProcedure: (procedure: CupsItem) => void;
}

const CupsModal: React.FC<CupsModalProps> = ({
  onClose,
  onSelectProcedure
}) => {
  // Filter state
  const [filters, setFilters] = useState({
    codigo: '',
    nombre: '',
    descripcion: ''
  });

  // Selected procedure state
  const [selectedProcedure, setSelectedProcedure] = useState<CupsItem | null>(null);

  // Mock cups data based on the image
  const [cupsData] = useState<CupsItem[]>([
    { id: '1', codigo: '010101', nombre: 'PUNCION CISTERNAL, VIA LATERAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '2', codigo: '010102', nombre: 'PUNCION CISTERNAL, VIA MEDIAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '3', codigo: '010103', nombre: 'PUNCION CISTERNAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '4', codigo: '010201', nombre: 'PUNCION (ASPIRACION DE LIQUIDO) VENTRICULAR A TRAVES DE CATET...', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '5', codigo: '010202', nombre: 'PUNCION (ASPIRACION DE LIQUIDO) VENTRICULAR POR TREPANACION (...', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '6', codigo: '010203', nombre: 'PUNCION (ASPIRACION DE LIQUIDO) VENTRICULAR A TRAVES DE UN RE...', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '7', codigo: '010204', nombre: 'PUNCION (ASPIRACION DE LIQUIDO) VENTRICULAR, VIA TRANSFONTANE...', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '8', codigo: '010205', nombre: 'PUNCION (ASPIRACION DE LIQUIDO) VENTRICULAR', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '9', codigo: '010901', nombre: 'PUNCION SUBDURAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '10', codigo: '010902', nombre: 'OTRA PUNCION CRANEAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '11', codigo: '011101', nombre: 'BIOPSIA OSEA EN CRANEO POR CRANEOTOMIA', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '12', codigo: '011102', nombre: 'BIOPSIA OSEA EN CRANEO POR CRANIECTOMIA', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '13', codigo: '011103', nombre: 'BIOPSIA DE CRANEO', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '14', codigo: '011201', nombre: 'CRANEOTOMIA EXPLORATORIA', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '15', codigo: '011202', nombre: 'CRANEOTOMIA PARA EVACUACION DE HEMATOMA', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '16', codigo: '011203', nombre: 'CRANEOTOMIA PARA RESECCION DE TUMOR', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '17', codigo: '011301', nombre: 'LAMINECTOMIA CERVICAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '18', codigo: '011302', nombre: 'LAMINECTOMIA DORSAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '19', codigo: '011303', nombre: 'LAMINECTOMIA LUMBAR', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' },
    { id: '20', codigo: '011401', nombre: 'DISECTOMIA CERVICAL', descripcion: 'Capitulo 01 SISTEMA NERVIOSO' }
  ]);

  // Filter cups data based on current filters
  const filteredCupsData = cupsData.filter(item => {
    const matchesText = 
      item.codigo.toLowerCase().includes(filters.codigo.toLowerCase()) &&
      item.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
      item.descripcion.toLowerCase().includes(filters.descripcion.toLowerCase());
    return matchesText;
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcedureSelect = (procedure: CupsItem) => {
    if (selectedProcedure?.id === procedure.id) {
      // Deselect if already selected
      setSelectedProcedure(null);
    } else {
      setSelectedProcedure(procedure);
    }
  };

  const handleSelectProcedure = () => {
    if (selectedProcedure) {
      onSelectProcedure(selectedProcedure);
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
            Cups
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
            gap: 2
          }}>
            {/* Filter Fields - Row Layout */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mb: 0.25, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Código
              </Typography>
              <TextField
                size="small"
                value={filters.codigo}
                onChange={(e) => handleFilterChange('codigo', e.target.value)}
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
            
            <Box sx={{ flex: 1 }}>
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
            
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mb: 0.25, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Descripción
              </Typography>
              <TextField
                size="small"
                value={filters.descripcion}
                onChange={(e) => handleFilterChange('descripcion', e.target.value)}
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
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCupsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, color: '#666' }}>
                        No se encontraron procedimientos que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCupsData.map((procedure) => (
                      <TableRow 
                        key={procedure.id}
                        hover
                        selected={selectedProcedure?.id === procedure.id}
                        onClick={() => handleProcedureSelect(procedure)}
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: selectedProcedure?.id === procedure.id ? '#e3f2fd' : 'inherit',
                          '&:hover': {
                            backgroundColor: selectedProcedure?.id === procedure.id ? '#e3f2fd' : '#f5f5f5'
                          }
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.875rem' }}>{procedure.codigo}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{procedure.nombre}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{procedure.descripcion}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Button
                            variant={selectedProcedure?.id === procedure.id ? "outlined" : "contained"}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcedureSelect(procedure);
                            }}
                            sx={{
                              minWidth: '100px',
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              ...(selectedProcedure?.id === procedure.id ? {
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
                            {selectedProcedure?.id === procedure.id ? 'Remover' : 'Seleccionar'}
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
            onClick={handleSelectProcedure}
            disabled={!selectedProcedure}
            sx={{
              backgroundColor: selectedProcedure ? '#2B5797' : '#cccccc',
              color: 'white',
              minWidth: '120px',
              '&:hover': {
                backgroundColor: selectedProcedure ? '#1e3f6f' : '#cccccc'
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

export default CupsModal;
