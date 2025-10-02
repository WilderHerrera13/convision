import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Checkbox, 
  FormControlLabel,
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

interface LensItem {
  id: string;
  codigo: string;
  identificador: string;
  descripcion: string;
}

interface LensRecommendationModalProps {
  onClose: () => void;
  onSelectLens: (lens: LensItem) => void;
}

const LensRecommendationModal: React.FC<LensRecommendationModalProps> = ({
  onClose,
  onSelectLens
}) => {
  // Filter states
  const [filters, setFilters] = useState({
    codigo: '',
    identificador: '',
    descripcion: '',
    material: '',
    monofocales: false,
    bifocal: false,
    ocupacional: false,
    progresivos: false,
    tallado: false,
    terminado: false,
    tieneTratamiento: false,
    tieneFotocromatico: false
  });

  // Selected lens state
  const [selectedLens, setSelectedLens] = useState<LensItem | null>(null);

  // Mock lens data
  const [lensData] = useState<LensItem[]>([
    { id: '1', codigo: 'L1', identificador: '1000', descripcion: 'Progresivo FOCUS PLATINUM/1.60 /talla Digital/HI IMPACT AR VERDE' },
    { id: '2', codigo: 'L2', identificador: '1206', descripcion: 'CR 39/talla Convencional/Transitions' },
    { id: '3', codigo: 'L3', identificador: '1001', descripcion: 'Progresivo /1.56' },
    { id: '4', codigo: 'L4', identificador: '1002', descripcion: 'Monofocal /1.50' },
    { id: '5', codigo: 'L5', identificador: '1003', descripcion: 'Bifocal /1.60' },
    { id: '6', codigo: 'L6', identificador: '1004', descripcion: 'Ocupacional /1.67' },
    { id: '7', codigo: 'L7', identificador: '1005', descripcion: 'Progresivo Digital /1.74' },
    { id: '8', codigo: 'L8', identificador: '1006', descripcion: 'Monofocal con tratamiento' },
    { id: '9', codigo: 'L9', identificador: '1007', descripcion: 'Bifocal fotocromático' },
    { id: '10', codigo: 'L10', identificador: '1008', descripcion: 'Progresivo tallado' },
    { id: '11', codigo: 'L11', identificador: '1009', descripcion: 'Monofocal terminado' },
    { id: '12', codigo: 'L12', identificador: '1010', descripcion: 'Ocupacional con AR' },
    { id: '13', codigo: 'L13', identificador: '1011', descripcion: 'Progresivo Premium' },
    { id: '14', codigo: 'L14', identificador: '1012', descripcion: 'Bifocal Digital' },
    { id: '15', codigo: 'L15', identificador: '1013', descripcion: 'Monofocal Transitions' }
  ]);

  // Filter lens data based on current filters
  const filteredLensData = lensData.filter(lens => {
    const matchesText = 
      lens.codigo.toLowerCase().includes(filters.codigo.toLowerCase()) &&
      lens.identificador.toLowerCase().includes(filters.identificador.toLowerCase()) &&
      lens.descripcion.toLowerCase().includes(filters.descripcion.toLowerCase()) &&
      lens.descripcion.toLowerCase().includes(filters.material.toLowerCase());

    // For now, we'll just use text matching since we don't have actual lens type data
    // In a real implementation, you'd filter based on the actual lens properties
    return matchesText;
  });

  const handleFilterChange = (field: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLensSelect = (lens: LensItem) => {
    if (selectedLens?.id === lens.id) {
      // Deselect if already selected
      setSelectedLens(null);
    } else {
      setSelectedLens(lens);
    }
  };

  const handleSelectLens = () => {
    if (selectedLens) {
      onSelectLens(selectedLens);
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
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      height: '90vh',
      maxHeight: '90vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
          Lentes
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
          {/* Column 1: Input Fields (Stacked) */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
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
            
            <Box>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mb: 0.25, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Identificador
              </Typography>
              <TextField
                size="small"
                value={filters.identificador}
                onChange={(e) => handleFilterChange('identificador', e.target.value)}
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
            
            <Box>
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
            
            <Box>
              <Typography sx={{ 
                fontSize: '0.75rem', 
                mb: 0.25, 
                fontWeight: 500,
                color: '#374151'
              }}>
                Material
              </Typography>
              <TextField
                size="small"
                value={filters.material}
                onChange={(e) => handleFilterChange('material', e.target.value)}
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

          {/* Column 2: Checkboxes */}
          <Box sx={{ flex: 1, display: 'flex', gap: 3 }}>
            {/* Checkbox Column 1 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.monofocales}
                    onChange={(e) => handleFilterChange('monofocales', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Monofocales"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.bifocal}
                    onChange={(e) => handleFilterChange('bifocal', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Bifocal"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.ocupacional}
                    onChange={(e) => handleFilterChange('ocupacional', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Ocupacional"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.progresivos}
                    onChange={(e) => handleFilterChange('progresivos', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Progresivos"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
            </Box>

            {/* Checkbox Column 2 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.tallado}
                    onChange={(e) => handleFilterChange('tallado', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Tallado"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.terminado}
                    onChange={(e) => handleFilterChange('terminado', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Terminado"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.tieneTratamiento}
                    onChange={(e) => handleFilterChange('tieneTratamiento', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Tiene tratamiento"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.tieneFotocromatico}
                    onChange={(e) => handleFilterChange('tieneFotocromatico', e.target.checked)}
                    sx={{ color: '#374151', padding: '4px' }}
                  />
                }
                label="Tiene fotocromático"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Identificador</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Descripción</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Seleccionar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLensData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 2, color: '#666' }}>
                      No se encontraron lentes que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLensData.map((lens) => (
                    <TableRow 
                      key={lens.id}
                      hover
                      selected={selectedLens?.id === lens.id}
                      onClick={() => handleLensSelect(lens)}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedLens?.id === lens.id ? '#e3f2fd' : 'inherit',
                        '&:hover': {
                          backgroundColor: selectedLens?.id === lens.id ? '#e3f2fd' : '#f5f5f5'
                        }
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.875rem' }}>{lens.codigo}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{lens.identificador}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{lens.descripcion}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          variant={selectedLens?.id === lens.id ? "outlined" : "contained"}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLensSelect(lens);
                          }}
                          sx={{
                            minWidth: '100px',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            ...(selectedLens?.id === lens.id ? {
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
                          {selectedLens?.id === lens.id ? 'Remover' : 'Seleccionar'}
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
          onClick={handleSelectLens}
          disabled={!selectedLens}
          sx={{
            backgroundColor: selectedLens ? '#2B5797' : '#cccccc',
            color: 'white',
            minWidth: '120px',
            '&:hover': {
              backgroundColor: selectedLens ? '#1e3f6f' : '#cccccc'
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
  );
};

export default LensRecommendationModal;
