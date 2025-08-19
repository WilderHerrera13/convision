import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardContent, Grid, Typography, Button, Box, Tabs, Tab, 
  Divider, CircularProgress, Paper, Alert 
} from '@mui/material';
import { ArrowBack, Edit, Add } from '@mui/icons-material';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import ClinicalHistoryForm from '../../components/clinical/ClinicalHistoryForm';
import ClinicalEvolutionsList from '../../components/clinical/ClinicalEvolutionsList';
import NewEvolutionForm from '../../components/clinical/NewEvolutionForm';
import PatientInfo from '../../components/patients/PatientInfo';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  identification?: string;
  [key: string]: unknown;
}

interface ClinicalHistoryData {
  id: number;
  patient_id: number;
  reason_for_consultation: string;
  current_illness?: string;
  personal_history?: string;
  family_history?: string;
  occupational_history?: string;
  uses_optical_correction: boolean;
  optical_correction_type?: string;
  last_control_detail?: string;
  ophthalmological_diagnosis?: string;
  eye_surgery?: string;
  has_systemic_disease: boolean;
  systemic_disease_detail?: string;
  medications?: string;
  allergies?: string;
  diagnostic?: string;
  treatment_plan?: string;
  observations?: string;
  creator?: {
    name: string;
  };
  [key: string]: unknown;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`clinical-history-tabpanel-${index}`}
      aria-labelledby={`clinical-history-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `clinical-history-tab-${index}`,
    'aria-controls': `clinical-history-tabpanel-${index}`,
  };
}

const ClinicalHistory = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showHistoryForm, setShowHistoryForm] = useState<boolean>(false);
  const [showNewEvolutionForm, setShowNewEvolutionForm] = useState<boolean>(false);

  // Extract appointmentId from URL query parameters
  const appointmentId = searchParams.get('appointmentId') ? Number(searchParams.get('appointmentId')) : undefined;

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch patient data
        const patientResponse = await api.get(`/api/v1/patients/${patientId}`);
        setPatient(patientResponse.data.data);

        // Try to fetch clinical history
        try {
          const historyResponse = await api.get(`/api/v1/patients/${patientId}/clinical-history`);
          setClinicalHistory(historyResponse.data.data);
        } catch (historyError: unknown) {
          const apiError = historyError as ApiError;
          // If 404, history doesn't exist yet, which is fine
          if (apiError.response && apiError.response.status !== 404) {
            throw historyError;
          }
        }

        setLoading(false);
      } catch (err: unknown) {
        setLoading(false);
        const apiError = err as ApiError;
        setError(apiError.response?.data?.error || 'Error al cargar la información');
        console.error(err);
      }
    };

    if (patientId && user) {
      fetchPatientData();
    }
  }, [patientId, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleHistoryCreated = (newHistory: ClinicalHistoryData) => {
    setClinicalHistory(newHistory);
    setShowHistoryForm(false);
  };

  const handleHistoryUpdated = (updatedHistory: ClinicalHistoryData) => {
    setClinicalHistory(updatedHistory);
    setShowHistoryForm(false);
  };

  const handleEvolutionCreated = () => {
    // Refresh the clinical history data to get the new evolution
    const fetchUpdatedHistory = async () => {
      try {
        const historyResponse = await api.get(`/api/v1/patients/${patientId}/clinical-history`);
        setClinicalHistory(historyResponse.data.data);
        setShowNewEvolutionForm(false);
        setTabValue(1);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUpdatedHistory();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="500px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={3}>
        <Alert severity="error">{error}</Alert>
        <Box mt={2}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
            Volver
          </Button>
        </Box>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box my={3}>
        <Alert severity="warning">No se encontró el paciente.</Alert>
        <Box mt={2}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
            Volver
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
          Volver
        </Button>
        <Typography variant="h5">Historia Clínica</Typography>
        <Box>
          {clinicalHistory ? (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Edit />}
              onClick={() => setShowHistoryForm(true)}
              sx={{ ml: 2 }}
              disabled={showHistoryForm}
            >
              Editar Historia
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Add />}
              onClick={() => setShowHistoryForm(true)}
              disabled={showHistoryForm}
            >
              Crear Historia Clínica
            </Button>
          )}
          {clinicalHistory && (
            <Button 
              variant="contained" 
              color="secondary" 
              startIcon={<Add />}
              onClick={() => setShowNewEvolutionForm(true)}
              sx={{ ml: 2 }}
              disabled={showNewEvolutionForm}
            >
              Nueva Evolución
            </Button>
          )}
        </Box>
      </Box>

      <PatientInfo patient={patient} />

      {showHistoryForm ? (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {clinicalHistory ? "Editar Historia Clínica" : "Nueva Historia Clínica"}
          </Typography>
          <ClinicalHistoryForm 
            patient={patient} 
            initialData={clinicalHistory} 
            onCancel={() => setShowHistoryForm(false)}
            onSave={clinicalHistory ? handleHistoryUpdated : handleHistoryCreated}
          />
        </Paper>
      ) : showNewEvolutionForm ? (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Nueva Evolución
          </Typography>
          <NewEvolutionForm 
            clinicalHistoryId={clinicalHistory.id} 
            appointmentId={appointmentId}
            onCancel={() => setShowNewEvolutionForm(false)}
            onSave={handleEvolutionCreated}
          />
        </Paper>
      ) : clinicalHistory ? (
        <Card sx={{ mt: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="clinical history tabs">
              <Tab label="Historia Clínica" {...a11yProps(0)} />
              <Tab label="Evoluciones" {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos Básicos</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Motivo de Consulta:</Typography>
                  <Typography variant="body2">{clinicalHistory.reason_for_consultation}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Creado por:</Typography>
                  <Typography variant="body2">{clinicalHistory.creator?.name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Enfermedad Actual:</Typography>
                  <Typography variant="body2">{clinicalHistory.current_illness || 'No registrada'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Antecedentes</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Personales:</Typography>
                  <Typography variant="body2">{clinicalHistory.personal_history || 'No registrados'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Familiares:</Typography>
                  <Typography variant="body2">{clinicalHistory.family_history || 'No registrados'}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Ocupacionales:</Typography>
                  <Typography variant="body2">{clinicalHistory.occupational_history || 'No registrados'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Antecedentes Visuales</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Usa corrección óptica:</Typography>
                  <Typography variant="body2">{clinicalHistory.uses_optical_correction ? 'Sí' : 'No'}</Typography>
                </Grid>
                {clinicalHistory.uses_optical_correction && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Tipo de corrección:</Typography>
                    <Typography variant="body2">{clinicalHistory.optical_correction_type || 'No especificado'}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Último control:</Typography>
                  <Typography variant="body2">{clinicalHistory.last_control_detail || 'No registrado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Diagnóstico oftalmológico previo:</Typography>
                  <Typography variant="body2">{clinicalHistory.ophthalmological_diagnosis || 'No registrado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Cirugía ocular:</Typography>
                  <Typography variant="body2">{clinicalHistory.eye_surgery || 'No registrada'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Información Médica</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Enfermedad sistémica:</Typography>
                  <Typography variant="body2">{clinicalHistory.has_systemic_disease ? 'Sí' : 'No'}</Typography>
                </Grid>
                {clinicalHistory.has_systemic_disease && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">Detalle:</Typography>
                    <Typography variant="body2">{clinicalHistory.systemic_disease_detail || 'No especificado'}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Medicamentos:</Typography>
                  <Typography variant="body2">{clinicalHistory.medications || 'No registrados'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Alergias:</Typography>
                  <Typography variant="body2">{clinicalHistory.allergies || 'No registradas'}</Typography>
                </Grid>
              </Grid>

              {/* More sections can be added to display all clinical history data */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Diagnóstico y Plan de Tratamiento</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Diagnóstico:</Typography>
                  <Typography variant="body2">{clinicalHistory.diagnostic || 'No registrado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Plan de tratamiento:</Typography>
                  <Typography variant="body2">{clinicalHistory.treatment_plan || 'No registrado'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Observaciones:</Typography>
                  <Typography variant="body2">{clinicalHistory.observations || 'No registradas'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ClinicalEvolutionsList clinicalHistoryId={clinicalHistory.id} />
          </TabPanel>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mt: 3 }}>
          Este paciente aún no tiene historia clínica. Cree una utilizando el botón "Crear Historia Clínica".
        </Alert>
      )}
    </div>
  );
};

export default ClinicalHistory; 