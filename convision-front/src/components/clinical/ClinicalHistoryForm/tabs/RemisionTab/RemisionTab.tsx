import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { TouchApp, Search, Add, Remove, CalendarToday } from '@mui/icons-material';
import VademecumModal from './VademecumModal';
import CupsModal from './CupsModal';
import { useClinicalHistoryContext } from '../../context/ClinicalHistoryContext';

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

const RemisionTab: React.FC = () => {
  const { formData: globalFormData, updateTabData, updateField } = useClinicalHistoryContext();
  
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    // Header fields
    fecha: 'martes . 19 de agosto de 2025',
    paciente_id: '1122145671',
    paciente_nombre: 'PAULA ALEJANDRA VALDERRAMA GARCIA',
    profesional_id: '1122145671',
    profesional_nombre: 'Paula Alejandra Valderrama Garcia',
    
    // Procedimientos tab
    nombre: '',
    
    // Medicamentos tab
    nombre_comercial: '',
    principio_activo: '',
    presentacion: '',
    cantidad: '',
    dosis: 'Aplicar en la noche',
    cantidad_suministrar: '1 Gota en ambos ojos',
    duracion_tratamiento: 'Por un mes',
    
    // Exámenes tab
    examen_solicitado: '',
    ojo: 'AO',
    
    // Observations
    observaciones: ''
  });

  const [cupsData, setCupsData] = useState([
    // Empty for now, will be populated when items are added
  ]);

  const [medicamentosData, setMedicamentosData] = useState([
    // Empty for now, will be populated when items are added
  ]);

  const [examenesData, setExamenesData] = useState([
    // Empty for now, will be populated when items are added
  ]);

  // Modal state
  const [showVademecumModal, setShowVademecumModal] = useState(false);
  const [showCupsModal, setShowCupsModal] = useState(false);

  // Load data from context on mount
  useEffect(() => {
    if (globalFormData.remisionTab) {
      setFormData(prev => ({
        ...prev,
        ...globalFormData.remisionTab.formData
      }));
      if (globalFormData.remisionTab.cupsData) {
        setCupsData(globalFormData.remisionTab.cupsData);
      }
      if (globalFormData.remisionTab.medicamentosData) {
        setMedicamentosData(globalFormData.remisionTab.medicamentosData);
      }
      if (globalFormData.remisionTab.examenesData) {
        setExamenesData(globalFormData.remisionTab.examenesData);
      }
    }
  }, []);

  // Update context whenever data changes
  useEffect(() => {
    updateTabData('remisionTab', {
      formData,
      cupsData,
      medicamentosData,
      examenesData
    });
  }, [formData, cupsData, medicamentosData, examenesData]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePacienteButton = () => {
    console.log('Paciente button clicked');
  };

  const handleProfesionalButton = () => {
    console.log('Profesional button clicked');
  };

  const handleNombreButton = () => {
    setShowCupsModal(true);
  };

  const handleBuscar = () => {
    console.log('Buscar clicked');
  };

  const handleAddCups = () => {
    const newCups = {
      id: Date.now(),
      codigo: '',
      nombre: ''
    };
    setCupsData([...cupsData, newCups]);
  };

  const handleRemoveCups = (id: number) => {
    setCupsData(cupsData.filter(item => item.id !== id));
  };

  const handleCupsChange = (id: number, field: string, value: string) => {
    setCupsData(cupsData.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddObservacion = () => {
    console.log('Add observacion clicked');
  };

  const handleMedicamentoButton = () => {
    console.log('Medicamento button clicked');
  };

  const handleAddMedicamento = () => {
    const newMedicamento = {
      id: Date.now(),
      nombre_comercial: formData.nombre_comercial,
      principio_activo: formData.principio_activo,
      presentacion: formData.presentacion,
      cantidad: formData.cantidad,
      dosis: formData.dosis,
      cantidad_suministrar: formData.cantidad_suministrar,
      duracion_tratamiento: formData.duracion_tratamiento
    };
    setMedicamentosData([...medicamentosData, newMedicamento]);
    
    // Clear form
    setFormData(prev => ({
      ...prev,
      nombre_comercial: '',
      principio_activo: '',
      presentacion: '',
      cantidad: '',
      dosis: 'Aplicar en la noche',
      cantidad_suministrar: '1 Gota en ambos ojos',
      duracion_tratamiento: 'Por un mes'
    }));
  };

  const handleRemoveMedicamento = (id: number) => {
    setMedicamentosData(medicamentosData.filter(item => item.id !== id));
  };

  const handleExamenButton = () => {
    setShowVademecumModal(true);
  };

  const handleAddExamen = () => {
    const newExamen = {
      id: Date.now(),
      examen_solicitado: formData.examen_solicitado,
      ojo: formData.ojo
    };
    setExamenesData([...examenesData, newExamen]);
    
    // Clear form
    setFormData(prev => ({
      ...prev,
      examen_solicitado: '',
      ojo: 'AO'
    }));
  };

  const handleRemoveExamen = (id: number) => {
    setExamenesData(examenesData.filter(item => item.id !== id));
  };

  const handleSelectExamen = (examen: { id: string; nombre: string }) => {
    setFormData(prev => ({
      ...prev,
      examen_solicitado: examen.nombre
    }));
    setShowVademecumModal(false);
  };

  const handleCloseVademecumModal = () => {
    setShowVademecumModal(false);
  };

  const handleSelectProcedure = (procedure: { id: string; codigo: string; nombre: string; descripcion: string }) => {
    setFormData(prev => ({
      ...prev,
      nombre: procedure.nombre
    }));
    setShowCupsModal(false);
  };

  const handleCloseCupsModal = () => {
    setShowCupsModal(false);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Section 1: Patient and Professional Information */}
        <SectionDivider title="Información del Paciente y Profesional">
          {/* Fecha */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Fecha
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={formData.fecha}
                onChange={handleInputChange('fecha')}
                size="small"
                sx={{ flex: '0 0 250px', bgcolor: 'white' }}
                InputProps={{
                  endAdornment: <CalendarToday sx={{ color: '#666', fontSize: '1.2rem' }} />
                }}
              />
            </Box>
          </Box>

          {/* Paciente */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Paciente
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                value={formData.paciente_id}
                onChange={handleInputChange('paciente_id')}
                size="small"
                sx={{ flex: '0 0 150px', bgcolor: 'white' }}
              />
              <TextField
                value={formData.paciente_nombre}
                onChange={handleInputChange('paciente_nombre')}
                size="small"
                sx={{ flex: 1, bgcolor: 'white' }}
              />
              <IconButton
                onClick={handlePacienteButton}
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

          {/* Profesional */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Profesional
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                value={formData.profesional_id}
                onChange={handleInputChange('profesional_id')}
                size="small"
                sx={{ flex: '0 0 150px', bgcolor: 'white' }}
              />
              <TextField
                value={formData.profesional_nombre}
                onChange={handleInputChange('profesional_nombre')}
                size="small"
                sx={{ flex: 1, bgcolor: 'white' }}
              />
              <IconButton
                onClick={handleProfesionalButton}
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

          {/* Buscar Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleBuscar}
              sx={{ 
                borderColor: '#3b82f6',
                color: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#f0f7ff',
                  borderColor: '#2563eb'
                },
                fontWeight: 600
              }}
            >
              Buscar
            </Button>
          </Box>
        </SectionDivider>

        {/* Section 2: Tab Navigation and Content */}
        <SectionDivider title="Procedimientos, Medicamentos y Exámenes">
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
            <Tab label="Procedimientos" />
            <Tab label="Medicamentos" />
            <Tab label="Exámenes" />
            <Tab label="General" />
          </Tabs>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Box>
              {/* Nombre field */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Nombre
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <TextField
                    value={formData.nombre}
                    onChange={handleInputChange('nombre')}
                    size="small"
                    fullWidth
                    sx={{ bgcolor: 'white' }}
                  />
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

              {/* CUPS Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                  Cups
                </Typography>
                
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    minHeight: '200px'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Código</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre</TableCell>
                        <TableCell sx={{ width: 100 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cupsData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                            No hay procedimientos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        cupsData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <TextField
                                value={item.codigo}
                                onChange={(e) => handleCupsChange(item.id, 'codigo', e.target.value)}
                                size="small"
                                fullWidth
                                variant="standard"
                                InputProps={{ disableUnderline: true }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                value={item.nombre}
                                onChange={(e) => handleCupsChange(item.id, 'nombre', e.target.value)}
                                size="small"
                                fullWidth
                                variant="standard"
                                InputProps={{ disableUnderline: true }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleRemoveCups(item.id)}
                                sx={{
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    backgroundColor: '#d32f2f'
                                  }
                                }}
                              >
                                <Remove sx={{ fontSize: '1.2rem' }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Add button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <IconButton
                    onClick={handleAddCups}
                    sx={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      width: 32,
                      height: 32,
                      '&:hover': {
                        backgroundColor: '#45a049'
                      }
                    }}
                  >
                    <Add sx={{ fontSize: '1.2rem' }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          )}

          {/* Medicamentos Tab Content */}
          {activeTab === 1 && (
            <Box>
              {/* Medication Form */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Nombre Comercial
                    </Typography>
                    <TextField
                      value={formData.nombre_comercial}
                      onChange={handleInputChange('nombre_comercial')}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Principio/Activo
                    </Typography>
                    <TextField
                      value={formData.principio_activo}
                      onChange={handleInputChange('principio_activo')}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Presentacion
                    </Typography>
                    <TextField
                      value={formData.presentacion}
                      onChange={handleInputChange('presentacion')}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Cantidad
                    </Typography>
                    <TextField
                      value={formData.cantidad}
                      onChange={handleInputChange('cantidad')}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Dosis
                    </Typography>
                    <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                      <Select
                        value={formData.dosis}
                        onChange={handleInputChange('dosis')}
                      >
                        <MenuItem value="Aplicar cada 4 horas">Aplicar cada 4 horas</MenuItem>
                        <MenuItem value="Aplicar cada 6 horas">Aplicar cada 6 horas</MenuItem>
                        <MenuItem value="Aplicar cada 8 horas">Aplicar cada 8 horas</MenuItem>
                        <MenuItem value="Aplicar cada hora">Aplicar cada hora</MenuItem>
                        <MenuItem value="Aplicar en la mañana">Aplicar en la mañana</MenuItem>
                        <MenuItem value="Aplicar en la tarde">Aplicar en la tarde</MenuItem>
                        <MenuItem value="Aplicar en la noche">Aplicar en la noche</MenuItem>
                        <MenuItem value="Tomar cada 12 horas">Tomar cada 12 horas</MenuItem>
                        <MenuItem value="Tomar cada 6 horas">Tomar cada 6 horas</MenuItem>
                        <MenuItem value="Tomar cada 8 horas">Tomar cada 8 horas</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Cantidad a suministrar
                    </Typography>
                    <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                      <Select
                        value={formData.cantidad_suministrar}
                        onChange={handleInputChange('cantidad_suministrar')}
                      >
                        <MenuItem value="1 Centímetro">1 Centímetro</MenuItem>
                        <MenuItem value="1 Comprimido">1 Comprimido</MenuItem>
                        <MenuItem value="1 Gota en ambos ojos">1 Gota en ambos ojos</MenuItem>
                        <MenuItem value="1 Gota en el ojo derecho">1 Gota en el ojo derecho</MenuItem>
                        <MenuItem value="1 Gota en el ojo izquierdo">1 Gota en el ojo izquierdo</MenuItem>
                        <MenuItem value="1 Gota en el ojo operado">1 Gota en el ojo operado</MenuItem>
                        <MenuItem value="1 Tableta">1 Tableta</MenuItem>
                        <MenuItem value="2 Cápsulas">2 Cápsulas</MenuItem>
                        <MenuItem value="2 Centímetros">2 Centímetros</MenuItem>
                        <MenuItem value="2 Tableros">2 Tableros</MenuItem>
                        <MenuItem value="3 Centímetros">3 Centímetros</MenuItem>
                        <MenuItem value="4 Centímetros">4 Centímetros</MenuItem>
                        <MenuItem value="5 Centímetros">5 Centímetros</MenuItem>
                        <MenuItem value="Control de parpados AD">Control de parpados AD</MenuItem>
                        <MenuItem value="Dentro de parpados OD">Dentro de parpados OD</MenuItem>
                        <MenuItem value="Dentro de parpados OI">Dentro de parpados OI</MenuItem>
                        <MenuItem value="En parpados OD">En parpados OD</MenuItem>
                        <MenuItem value="En parpados OI">En parpados OI</MenuItem>
                        <MenuItem value="En parpados AD">En parpados AD</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Duración de tratamiento
                    </Typography>
                    <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                      <Select
                        value={formData.duracion_tratamiento}
                        onChange={handleInputChange('duracion_tratamiento')}
                      >
                        <MenuItem value="Por 8 días">Por 8 días</MenuItem>
                        <MenuItem value="Por 10 días">Por 10 días</MenuItem>
                        <MenuItem value="Por 15 días">Por 15 días</MenuItem>
                        <MenuItem value="Por 20 días">Por 20 días</MenuItem>
                        <MenuItem value="Por 3 semanas">Por 3 semanas</MenuItem>
                        <MenuItem value="Por un mes">Por un mes</MenuItem>
                        <MenuItem value="Por tiempo indefinido">Por tiempo indefinido</MenuItem>
                        <MenuItem value="Por tres meses">Por tres meses</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <IconButton
                    onClick={handleMedicamentoButton}
                    sx={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#2563eb'
                      },
                      width: 40,
                      height: 40,
                      borderRadius: 1
                    }}
                  >
                    <TouchApp />
                  </IconButton>
                  <IconButton
                    onClick={() => setMedicamentosData([])}
                    sx={{
                      backgroundColor: '#f44336',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#d32f2f'
                      },
                      width: 40,
                      height: 40
                    }}
                  >
                    <Remove />
                  </IconButton>
                  <IconButton
                    onClick={handleAddMedicamento}
                    sx={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#45a049'
                      },
                      width: 40,
                      height: 40
                    }}
                  >
                    <Add />
                  </IconButton>
                </Box>
              </Box>

              {/* Medication Table */}
              <Box sx={{ mb: 3 }}>
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    minHeight: '200px'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Nombre Comercial</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Principio / Activo</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Presentacion</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Cantidad</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Dosis</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>CantidadSuministrar</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>DuracionTratamiento</TableCell>
                        <TableCell sx={{ width: 100 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {medicamentosData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                            No hay medicamentos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        medicamentosData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.nombre_comercial}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.principio_activo}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.presentacion}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.cantidad}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.dosis}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.cantidad_suministrar}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.duracion_tratamiento}</TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleRemoveMedicamento(item.id)}
                                sx={{
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    backgroundColor: '#d32f2f'
                                  }
                                }}
                              >
                                <Remove sx={{ fontSize: '1.2rem' }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}

          {/* Exámenes Tab Content */}
          {activeTab === 2 && (
            <Box>
              {/* Exam Form */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                      Examen(es) Solicitado(s)
                    </Typography>
                    <TextField
                      value={formData.examen_solicitado}
                      onChange={handleInputChange('examen_solicitado')}
                      size="small"
                      fullWidth
                      sx={{ bgcolor: 'white' }}
                    />
                  </Box>
                  <IconButton
                    onClick={handleExamenButton}
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
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151', alignSelf: 'flex-end', pb: 1 }}>
                    OJO
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 80, bgcolor: 'white' }}>
                    <Select
                      value={formData.ojo}
                      onChange={handleInputChange('ojo')}
                    >
                      <MenuItem value="AO">AO</MenuItem>
                      <MenuItem value="OD">OD</MenuItem>
                      <MenuItem value="OI">OI</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    onClick={() => setExamenesData([])}
                    sx={{
                      backgroundColor: '#f44336',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#d32f2f'
                      },
                      width: 40,
                      height: 40,
                      mb: 0.5
                    }}
                  >
                    <Remove />
                  </IconButton>
                  <IconButton
                    onClick={handleAddExamen}
                    sx={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#45a049'
                      },
                      width: 40,
                      height: 40,
                      mb: 0.5
                    }}
                  >
                    <Add />
                  </IconButton>
                </Box>
              </Box>

              {/* Exam Table */}
              <Box sx={{ mb: 3 }}>
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    minHeight: '200px'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Examen solicitado</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Ojo</TableCell>
                        <TableCell sx={{ width: 100 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {examenesData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                            No hay exámenes registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        examenesData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.examen_solicitado}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{item.ojo}</TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleRemoveExamen(item.id)}
                                sx={{
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  width: 32,
                                  height: 32,
                                  '&:hover': {
                                    backgroundColor: '#d32f2f'
                                  }
                                }}
                              >
                                <Remove sx={{ fontSize: '1.2rem' }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}

          {/* Other tabs placeholder */}
          {activeTab !== 0 && activeTab !== 1 && activeTab !== 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#666' }}>
                {activeTab === 3 && 'General - Próximamente'}
              </Typography>
            </Box>
          )}
        </SectionDivider>

        {/* Section 3: Observations */}
        <SectionDivider title="Observaciones">
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={formData.observaciones}
              onChange={handleInputChange('observaciones')}
              multiline
              rows={4}
              fullWidth
              placeholder="Ingrese observaciones aquí..."
              sx={{ bgcolor: 'white' }}
            />
            <IconButton
              onClick={handleAddObservacion}
              sx={{
                backgroundColor: '#4caf50',
                color: 'white',
                width: 40,
                height: 40,
                alignSelf: 'flex-start',
                mt: 1,
                '&:hover': {
                  backgroundColor: '#45a049'
                }
              }}
            >
              <Add />
            </IconButton>
          </Box>
        </SectionDivider>
      </Box>

      {/* Vademecum Modal */}
      {showVademecumModal && (
        <VademecumModal
          onClose={handleCloseVademecumModal}
          onSelectExamen={handleSelectExamen}
        />
      )}

      {/* Cups Modal */}
      {showCupsModal && (
        <CupsModal
          onClose={handleCloseCupsModal}
          onSelectProcedure={handleSelectProcedure}
        />
      )}
    </Box>
  );
};

export default RemisionTab;
