import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button
} from '@mui/material';
import { Save } from '@mui/icons-material';
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

const ProtesisTab: React.FC = () => {
  const { formData: globalFormData, updateTabData, updateField } = useClinicalHistoryContext();
  
  // Local state initialized from context
  const [formData, setFormData] = useState({
    // Primary Information
    protesis: '',
    cascarilla: '',
    od: '',
    oi: '',
    diametro_iris: '',
    diametro_iris_muestra: '',
    diametro_pupila: '',
    diametro_pupila_muestra: '',
    color_iris_muestra: '',
    detalles: '',
    
    // Sclera
    esclera: 'Oscura',
    esclera_muestra: '',
    
    // Vein Quantity
    cantidad_venas: 'Regular',
    venas_muestra: '',
    
    // Final Details
    forma_muestra: '',
    cantidad_muestras: '',
    
    // Observations
    observaciones: ''
  });

  // Load data from context on mount
  useEffect(() => {
    if (globalFormData.protesisTab) {
      setFormData(prev => ({
        ...prev,
        ...globalFormData.protesisTab
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
    updateField('protesisTab', field, value);
  };

  const handleSave = () => {
    console.log('Saving prosthesis data:', formData);
    // Update context with all data
    updateTabData('protesisTab', formData);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Section 1: Primary Information */}
        <SectionDivider title="Información Principal">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
            {/* First Row: two columns -> [Prótesis, Cascarilla] | [OD, OI] */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Column 1: Prótesis, Cascarilla */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    Prótesis
                  </Typography>
                  <TextField
                    value={formData.protesis}
                    onChange={handleInputChange('protesis')}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    Cascarilla
                  </Typography>
                  <TextField
                    value={formData.cascarilla}
                    onChange={handleInputChange('cascarilla')}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
              </Box>
              {/* Column 2: OD, OI */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    OD
                  </Typography>
                  <TextField
                    value={formData.od}
                    onChange={handleInputChange('od')}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    OI
                  </Typography>
                  <TextField
                    value={formData.oi}
                    onChange={handleInputChange('oi')}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Second Row: two stacked rows; each row has two columns */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Row 1: Diámetro Iris | ó según muestra nº */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    Diámetro Iris
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      value={formData.diametro_iris}
                      onChange={handleInputChange('diametro_iris')}
                      size="small"
                      sx={{ flex: 1, bgcolor: 'white' }}
                    />
                    <Typography variant="body2" sx={{ color: '#374151' }}>mm</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3.5 }}>
                    <Typography variant="body2" sx={{ color: '#374151' }}>ó según muestra nº</Typography>
                    <TextField
                      value={formData.diametro_iris_muestra}
                      onChange={handleInputChange('diametro_iris_muestra')}
                      size="small"
                      sx={{ flex: 1, bgcolor: 'white' }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Row 2: Diámetro Pupila | ó según muestra nº */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                    Diámetro Pupila
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      value={formData.diametro_pupila}
                      onChange={handleInputChange('diametro_pupila')}
                      size="small"
                      sx={{ flex: 1, bgcolor: 'white' }}
                    />
                    <Typography variant="body2" sx={{ color: '#374151' }}>mm</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3.5 }}>
                    <Typography variant="body2" sx={{ color: '#374151' }}>ó según muestra nº</Typography>
                    <TextField
                      value={formData.diametro_pupila_muestra}
                      onChange={handleInputChange('diametro_pupila_muestra')}
                      size="small"
                      sx={{ flex: 1, bgcolor: 'white' }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Third Row: column -> Color de Iris según muestra nº, then Detalles */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ width: '49%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>
                    Color de Iris según muestra nº
                  </Typography>
                  <TextField
                    value={formData.color_iris_muestra}
                    onChange={handleInputChange('color_iris_muestra')}
                    size="small"
                    sx={{ flex: 1, bgcolor: 'white' }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Detalles
                </Typography>
                <TextField
                  value={formData.detalles}
                  onChange={handleInputChange('detalles')}
                  multiline
                  rows={4}
                  fullWidth
                  sx={{ bgcolor: 'white' }}
                />
              </Box>
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 2: Sclera */}
        <SectionDivider title="Esclera">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl component="fieldset">
              <RadioGroup
                value={formData.esclera}
                onChange={handleInputChange('esclera')}
                row
                sx={{ gap: 2 }}
              >
                <FormControlLabel 
                  value="Blanca" 
                  control={<Radio />} 
                  label="Blanca" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Azulado" 
                  control={<Radio />} 
                  label="Azulado" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Amarillenta" 
                  control={<Radio />} 
                  label="Amarillenta" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Oscura" 
                  control={<Radio />} 
                  label="Oscura" 
                  sx={{ color: '#374151' }}
                />
              </RadioGroup>
            </FormControl>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#374151' }}>Según muestra nº</Typography>
              <TextField
                value={formData.esclera_muestra}
                onChange={handleInputChange('esclera_muestra')}
                size="small"
                sx={{ flex: 1, maxWidth: 200, bgcolor: 'white' }}
              />
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 3: Vein Quantity */}
        <SectionDivider title="Cantidad de venas">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl component="fieldset">
              <RadioGroup
                value={formData.cantidad_venas}
                onChange={handleInputChange('cantidad_venas')}
                row
                sx={{ gap: 2 }}
              >
                <FormControlLabel 
                  value="Ninguna" 
                  control={<Radio />} 
                  label="Ninguna" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Pocas" 
                  control={<Radio />} 
                  label="Pocas" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Regular" 
                  control={<Radio />} 
                  label="Regular" 
                  sx={{ color: '#374151' }}
                />
                <FormControlLabel 
                  value="Muchas" 
                  control={<Radio />} 
                  label="Muchas" 
                  sx={{ color: '#374151' }}
                />
              </RadioGroup>
            </FormControl>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#374151' }}>Según muestra nº</Typography>
              <TextField
                value={formData.venas_muestra}
                onChange={handleInputChange('venas_muestra')}
                size="small"
                sx={{ flex: 1, maxWidth: 200, bgcolor: 'white' }}
              />
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 4: Final Details */}
        <SectionDivider title="Detalles Finales">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{width: "30%"}}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Forma según muestra nº
              </Typography>
              <TextField
                value={formData.forma_muestra}
                onChange={handleInputChange('forma_muestra')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            
            <Box sx={{width: "15%"}}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Cantidad Muestras
              </Typography>
              <TextField
                value={formData.cantidad_muestras}
                onChange={handleInputChange('cantidad_muestras')}
                size="small"
                fullWidth
                sx={{ bgcolor: 'white' }}
              />
            </Box>
          </Box>
        </SectionDivider>

        {/* Section 5: Observations */}
        <SectionDivider title="Observaciones">
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Observaciones
            </Typography>
            <TextField
              value={formData.observaciones}
              onChange={handleInputChange('observaciones')}
              multiline
              rows={4}
              fullWidth
              sx={{ bgcolor: 'white' }}
            />
          </Box>
        </SectionDivider>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            sx={{
              backgroundColor: '#2B5797',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1e3f6f'
              },
              fontWeight: 600
            }}
          >
            Guardar
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProtesisTab;
