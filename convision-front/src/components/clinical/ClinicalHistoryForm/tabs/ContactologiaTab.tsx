import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material';
import { TouchApp } from '@mui/icons-material';
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

const ContactologiaTab: React.FC = () => {
  const { formData: globalFormData, updateTabData, updateField } = useClinicalHistoryContext();
  
  const [formData, setFormData] = useState({
    // Patient Information
    documento: '1122145671',
    nombre_cliente: 'PAULA ALEJANDRA VALDERRAMA GARCIA',
    celular: '3012960788',
    telefono: '',
    n_contactologia: '158',
    fecha: 'martes . 19 de agosto de 2025',
    
    // Visual Acuity
    n_formula: '',
    n_historia: '',
    
    // Ojo Derecho Visual Acuity
    od_esfera: '',
    od_cilindro: '',
    od_eje: '',
    od_adicion: '',
    od_av_lejos: '',
    od_av_cerca: '',
    od_queratometria: '/ X /',
    
    // Ojo Izquierdo Visual Acuity
    oi_esfera: '',
    oi_cilindro: '',
    oi_eje: '',
    oi_adicion: '',
    oi_av_lejos: '',
    oi_av_cerca: '',
    oi_queratometria: '/ X /',
    
    // Contact Lens Prescription
    tipo_lente: 'Tóricos',
    
    // Ojo Derecho Contact Lens
    od_cl_esfera: '',
    od_cl_cilindro: '',
    od_cl_eje: '',
    od_cl_adicion: '',
    od_cl_diametro: '',
    od_cl_curva: '',
    od_cl_poder: '',
    
    // Ojo Izquierdo Contact Lens
    oi_cl_esfera: '',
    oi_cl_cilindro: '',
    oi_cl_eje: '',
    oi_cl_adicion: '',
    oi_cl_diametro: '',
    oi_cl_curva: '',
    oi_cl_poder: '',
    
    // Additional Fields
    profesional: 'Paula Alejandra Valderrama Garcia',
    observacion: ''
  });

  // Load data from context on mount
  useEffect(() => {
    if (globalFormData.contactologiaTab) {
      setFormData(prev => ({
        ...prev,
        ...globalFormData.contactologiaTab
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
    updateField('contactologiaTab', field, value);
  };

  const handleNombreButton = () => {
    // Placeholder for future functionality - cursor button next to Nombre
    console.log('Nombre cursor button clicked');
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Section 1: Patient Information */}
        <SectionDivider title="Información del Paciente">
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
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
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flex: 2 }}>
              <Box sx={{flex: 1}}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Nombre cliente
                </Typography>
                <TextField
                  value={formData.nombre_cliente}
                  onChange={handleInputChange('nombre_cliente')}
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

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Celular
              </Typography>
              <TextField
                value={formData.celular}
                onChange={handleInputChange('celular')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Teléfono
              </Typography>
              <TextField
                value={formData.telefono}
                onChange={handleInputChange('telefono')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: '0 0 150px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                N° Contactologia
              </Typography>
              <TextField
                value={formData.n_contactologia}
                onChange={handleInputChange('n_contactologia')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Box sx={{ flex: '0 0 200px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Fecha
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formData.fecha}
                  onChange={handleInputChange('fecha')}
                >
                  <MenuItem value="martes . 19 de agosto de 2025">martes . 19 de agosto de 2025</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 2: Visual Acuity */}
        <SectionDivider title="Agudeza Visual">
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignContent: 'center', width: '50%' }}>
            <Box sx={{ flex: 1}}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                N° formula
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formData.n_formula}
                  onChange={handleInputChange('n_formula')}
                >
                  <MenuItem value="">Seleccionar</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1, width: '50%' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                N° Historia
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formData.n_historia}
                  onChange={handleInputChange('n_historia')}
                >
                  <MenuItem value="">Seleccionar</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Visual Acuity Table */}
          <Box sx={{ mb: 2 }}>
            {/* Table Headers */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ flex: '0 0 120px' }}></Box>
              {['Esfera', 'Cilindro', 'Eje', 'Adición', 'AV Lejos', 'AV Cerca', 'Queratometria'].map((header) => (
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
                { field: 'od_av_lejos', value: formData.od_av_lejos },
                { field: 'od_av_cerca', value: formData.od_av_cerca },
                { field: 'od_queratometria', value: formData.od_queratometria }
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
                  Ojo izquierdo
                </Typography>
              </Box>
              {[
                { field: 'oi_esfera', value: formData.oi_esfera },
                { field: 'oi_cilindro', value: formData.oi_cilindro },
                { field: 'oi_eje', value: formData.oi_eje },
                { field: 'oi_adicion', value: formData.oi_adicion },
                { field: 'oi_av_lejos', value: formData.oi_av_lejos },
                { field: 'oi_av_cerca', value: formData.oi_av_cerca },
                { field: 'oi_queratometria', value: formData.oi_queratometria }
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
          </Box>
        </SectionDivider>

        {/* Section 3: Contact Lens Final Prescription */}
        <SectionDivider title="Rx final de lente de contacto">
          <Box sx={{ mb: 2 }}>
            <Box sx={{ flex: '0 0 200px', width: "25%" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Tipo de lente
              </Typography>
              <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                <Select
                  value={formData.tipo_lente}
                  onChange={handleInputChange('tipo_lente')}
                >
                  <MenuItem value="Tóricos">Tóricos</MenuItem>
                  <MenuItem value="Esféricos">Esféricos</MenuItem>
                  <MenuItem value="Multifocales">Multifocales</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Contact Lens Table */}
          <Box sx={{ mb: 2 }}>
            {/* Table Headers */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ flex: '0 0 120px' }}></Box>
              {['Esfera', 'Cilindro', 'Eje', 'Adición', 'Diametro', 'Curva', 'Poder'].map((header) => (
                <Box key={header} sx={{ flex: '1 1 0' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center', color: '#374151' }}>
                    {header}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Ojo Derecho Contact Lens */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ flex: '0 0 120px', display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                  Ojo Derecho
                </Typography>
              </Box>
              {[
                { field: 'od_cl_esfera', value: formData.od_cl_esfera },
                { field: 'od_cl_cilindro', value: formData.od_cl_cilindro },
                { field: 'od_cl_eje', value: formData.od_cl_eje },
                { field: 'od_cl_adicion', value: formData.od_cl_adicion },
                { field: 'od_cl_diametro', value: formData.od_cl_diametro },
                { field: 'od_cl_curva', value: formData.od_cl_curva },
                { field: 'od_cl_poder', value: formData.od_cl_poder }
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

            {/* Ojo Izquierdo Contact Lens */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Box sx={{ flex: '0 0 120px', display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                  Ojo izquierdo
                </Typography>
              </Box>
              {[
                { field: 'oi_cl_esfera', value: formData.oi_cl_esfera },
                { field: 'oi_cl_cilindro', value: formData.oi_cl_cilindro },
                { field: 'oi_cl_eje', value: formData.oi_cl_eje },
                { field: 'oi_cl_adicion', value: formData.oi_cl_adicion },
                { field: 'oi_cl_diametro', value: formData.oi_cl_diametro },
                { field: 'oi_cl_curva', value: formData.oi_cl_curva },
                { field: 'oi_cl_poder', value: formData.oi_cl_poder }
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
          </Box>

          {/* Professional and Observations */}
          <Box sx={{ mb: 2, width: "40%" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Profesional
            </Typography>
            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
              <Select
                value={formData.profesional}
                onChange={handleInputChange('profesional')}
              >
                <MenuItem value="Paula Alejandra Valderrama Garcia">Paula Alejandra Valderrama Garcia</MenuItem>
                <MenuItem value="Dr. Juan Martínez">Dr. Juan Martínez</MenuItem>
                <MenuItem value="Dra. María López">Dra. María López</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box>
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
        </SectionDivider>
      </Box>
    </Box>
  );
};

export default ContactologiaTab;
