import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton
} from '@mui/material';
import { Save, Print, TouchApp } from '@mui/icons-material';
import LensRecommendationModal from './ClinicalHistoryTab/sections/Diagnostico/LensRecommendationModal';
import { useClinicalHistoryContext } from '../context/ClinicalHistoryContext';

// Section Divider Component
interface SectionDividerProps {
  title: string;
  children: React.ReactNode;
}

const SectionDivider: React.FC<SectionDividerProps> = ({ 
  title, 
  children 
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {/* Section Title with Line */}
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: '#e2e8f0',
            zIndex: 1
          }}
        />
        <Typography
          variant="body2"
          sx={{
            display: 'inline-block',
            bgcolor: '#e2e8f0',
            px: 2,
            py: 0.5,
            color: 'black',
            fontSize: '0.875rem',
            fontWeight: 600,
            position: 'relative',
            zIndex: 2,
            border: '1px solid #e2e8f0',
            borderRadius: 1
          }}
        >
          {title}
        </Typography>
      </Box>
      
      {/* Section Content */}
      <Box>
        {children}
      </Box>
    </Box>
  );
};

const RxFinalTab: React.FC = () => {
  const { formData: globalFormData, updateTabData, updateField } = useClinicalHistoryContext();
  
  const [formData, setFormData] = useState({
    fecha: 'martes, 19 de agosto de 2025',
    documento: '1122145671',
    nombre: 'PAULA ALEJANDRA VALDERRAMA GARCIA',
    // Ojo Derecho
    od_esfera: '-5.00',
    od_cilindro: '-0.75',
    od_eje: '35',
    od_adicion: '',
    od_altura_f: '',
    od_distancia_p: '31',
    od_lejos: '20/20',
    od_cerca: 'cD',
    // Ojo Izquierdo
    oi_esfera: '-5.00',
    oi_cilindro: '-0.75',
    oi_eje: '155',
    oi_adicion: '',
    oi_altura_f: '',
    oi_distancia_p: '31',
    oi_lejos: '20/20',
    oi_cerca: '0.50m',
    // Otros campos
    tipo_correccion: 'TOTAL',
    forma_uso: 'PERMANENTE',
    recomendacion: 'POLY VI/AR /VI SUN',
    profesional: 'Paula Alejandra Valderrama Garcia',
    observacion: 'CONTROL EN 1 AÑO'
  });

  // Lens recommendation modal state
  const [showLensModal, setShowLensModal] = useState(false);
  const [selectedLens, setSelectedLens] = useState<any>(null);

  // Load data from context on mount
  useEffect(() => {
    if (globalFormData.rxFinalTab) {
      setFormData(prev => ({
        ...prev,
        ...globalFormData.rxFinalTab
      }));
    }
  }, []);

  const handleInputChange = (field: string) => (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update context immediately
    updateField('rxFinalTab', field, value);
  };

  const handleNombreButton = () => {
    // Placeholder for future functionality - cursor button next to Nombre
    console.log('Nombre cursor button clicked');
  };

  const handleRecomendacionButton = () => {
    setShowLensModal(true);
  };

  const handleCloseLensModal = () => {
    setShowLensModal(false);
  };

  const handleSelectLens = (lens: any) => {
    setSelectedLens(lens);
    // Update the form with the selected lens information
    const newRecomendacion = lens.descripcion;
    setFormData(prev => ({
      ...prev,
      recomendacion: newRecomendacion
    }));
    // Update context
    updateField('rxFinalTab', 'recomendacion', newRecomendacion);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Section 1: Patient Information */}
        <SectionDivider title="Información del Paciente">
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: '0 0 300px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Fecha
              </Typography>
              <TextField
                value={formData.fecha}
                onChange={handleInputChange('fecha')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: '0 0 200px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Documento
              </Typography>
              <TextField
                value={formData.documento}
                onChange={handleInputChange('documento')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Nombre
                </Typography>
                <TextField
                  value={formData.nombre}
                  onChange={handleInputChange('nombre')}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <IconButton
                onClick={handleNombreButton}
                sx={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#2563eb'
                  },
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  alignSelf: 'flex-end'
                }}
              >
                <TouchApp />
              </IconButton>
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 2: Visual Acuity */}
        <SectionDivider title="Agudeza Visual">
          {/* Table Headers */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Box sx={{ flex: '0 0 120px' }}></Box>
            {['Esfera', 'Cilindro', 'Eje', 'Adición', 'Altura F', 'Distancia P', 'Lejos', 'Cerca'].map((header) => (
              <Box key={header} sx={{ flex: '1 1 0' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                  {header}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Ojo Derecho */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Box sx={{ flex: '0 0 120px', display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                Ojo Derecho
              </Typography>
            </Box>
            {[
              { field: 'od_esfera', value: formData.od_esfera },
              { field: 'od_cilindro', value: formData.od_cilindro },
              { field: 'od_eje', value: formData.od_eje },
              { field: 'od_adicion', value: formData.od_adicion },
              { field: 'od_altura_f', value: formData.od_altura_f },
              { field: 'od_distancia_p', value: formData.od_distancia_p },
              { field: 'od_lejos', value: formData.od_lejos },
              { field: 'od_cerca', value: formData.od_cerca }
            ].map((input) => (
              <Box key={input.field} sx={{ flex: '1 1 0' }}>
                <TextField
                  value={input.value}
                  onChange={handleInputChange(input.field)}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            ))}
          </Box>

          {/* Ojo Izquierdo */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Box sx={{ flex: '0 0 120px', display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                Ojo Izquierdo
              </Typography>
            </Box>
            {[
              { field: 'oi_esfera', value: formData.oi_esfera },
              { field: 'oi_cilindro', value: formData.oi_cilindro },
              { field: 'oi_eje', value: formData.oi_eje },
              { field: 'oi_adicion', value: formData.oi_adicion },
              { field: 'oi_altura_f', value: formData.oi_altura_f },
              { field: 'oi_distancia_p', value: formData.oi_distancia_p },
              { field: 'oi_lejos', value: formData.oi_lejos },
              { field: 'oi_cerca', value: formData.oi_cerca }
            ].map((input) => (
              <Box key={input.field} sx={{ flex: '1 1 0' }}>
                <TextField
                  value={input.value}
                  onChange={handleInputChange(input.field)}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            ))}
          </Box>
        </SectionDivider>

        {/* Section 3: Prescription Details */}
        <SectionDivider title="Detalles de la Prescripción">
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Tipo de corrección
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formData.tipo_correccion}
                  onChange={handleInputChange('tipo_correccion')}
                >
                  <MenuItem value="TOTAL">TOTAL</MenuItem>
                  <MenuItem value="PARCIAL">PARCIAL</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Forma de uso
              </Typography>
              <TextField
                value={formData.forma_uso}
                onChange={handleInputChange('forma_uso')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end'
            }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Recomendación
                </Typography>
                <TextField
                  value={formData.recomendacion}
                  onChange={handleInputChange('recomendacion')}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
              <IconButton
                onClick={handleRecomendacionButton}
                sx={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#2563eb'
                  },
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  alignSelf: 'flex-end'
                }}
              >
                <TouchApp />
              </IconButton>
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Profesional
            </Typography>
            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
              <Select
                value={formData.profesional}
                onChange={handleInputChange('profesional')}
              >
                <MenuItem value="Paula Alejandra Valderrama Garcia">Paula Alejandra Valderrama Garcia</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </SectionDivider>

        {/* Section 4: Observations and Attachments */}
        <SectionDivider title="Observaciones y Adjuntos">
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Observación
              </Typography>
              <TextField
                value={formData.observacion}
                onChange={handleInputChange('observacion')}
                multiline
                rows={3}
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: '0 0 200px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Adjunto
              </Typography>
              <Box 
                sx={{ 
                  height: 100,
                  backgroundColor: 'white',
                  border: '2px dashed #d1d5db',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: '#f9fafb',
                    borderColor: '#9ca3af'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: '#c4c3c2' }}>
                  Click para adjuntar
                </Typography>
              </Box>
            </Box>
          </Box>
        </SectionDivider>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Print />}
            sx={{ 
              borderColor: '#e2e8f0',
              color: 'black',
              backgroundColor: '#e2e8f0',
              '&:hover': {
                backgroundColor: '#d1d5db',
                borderColor: '#d1d5db',
                color: 'black'
              },
              fontWeight: 600
            }}
          >
            Imprimir
          </Button>
        </Box>
      </Box>

      {/* Lens Recommendation Modal */}
      {showLensModal && (
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
            <LensRecommendationModal
              onClose={handleCloseLensModal}
              onSelectLens={handleSelectLens}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RxFinalTab;