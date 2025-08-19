import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert,
  Accordion, AccordionSummary, AccordionDetails, Divider, Grid, Chip,
  Pagination
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { clinicalEvolutionService } from '@/services/clinicalEvolutionService';
import { ClinicalEvolution } from '@/services/clinicalHistoryService';

interface ClinicalEvolutionsListProps {
  clinicalHistoryId: number;
}

const ClinicalEvolutionsList: React.FC<ClinicalEvolutionsListProps> = ({ clinicalHistoryId }) => {
  const { user } = useAuth();
  const [evolutions, setEvolutions] = useState<ClinicalEvolution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    perPage: 10
  });

  const fetchEvolutions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await clinicalEvolutionService.getEvolutions(clinicalHistoryId, {
        page,
        per_page: pagination.perPage
      });

      // Set evolutions from response
      setEvolutions(response.data || []);
      
      // Safely access pagination meta data with fallbacks
      setPagination({
        currentPage: response.meta?.current_page || 1,
        totalPages: response.meta?.last_page || 1,
        perPage: response.meta?.per_page || 10
      });
      
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      setError('Error al cargar las evoluciones');
      console.error(err);
    }
  };

  useEffect(() => {
    if (clinicalHistoryId && user) {
      fetchEvolutions();
    }
  }, [clinicalHistoryId, user]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    fetchEvolutions(page);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (evolutions.length === 0) {
    return <Alert severity="info">No hay evoluciones registradas para este paciente.</Alert>;
  }

  return (
    <Box>
      {evolutions.map((evolution) => (
        <Accordion key={evolution.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
              <Typography variant="subtitle1">
                Evolución del {formatDate(evolution.evolution_date)}
              </Typography>
              <Box>
                {evolution.appointment && (
                  <Chip 
                    size="small" 
                    label={`Cita: ${new Date(evolution.appointment.scheduled_at).toLocaleDateString()}`} 
                    color="primary" 
                    sx={{ mr: 1 }} 
                  />
                )}
                <Chip 
                  size="small" 
                  label={`Por: ${evolution.creator.name}`} 
                  variant="outlined" 
                />
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>SOAP</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">S - Subjetivo:</Typography>
                    <Typography variant="body2">{evolution.subjective}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">O - Objetivo:</Typography>
                    <Typography variant="body2">{evolution.objective}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">A - Evaluación/Diagnóstico:</Typography>
                    <Typography variant="body2">{evolution.assessment}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">P - Plan:</Typography>
                    <Typography variant="body2">{evolution.plan}</Typography>
                  </Grid>
                  {evolution.recommendations && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Recomendaciones:</Typography>
                      <Typography variant="body2">{evolution.recommendations}</Typography>
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>Mediciones</Typography>
                <Grid container spacing={2}>
                  {/* First row: Vision */}
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Visión Lejana:</Typography>
                    <Typography variant="body2">
                      {evolution.right_far_vision || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Visión Lejana:</Typography>
                    <Typography variant="body2">
                      {evolution.left_far_vision || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Visión Cercana:</Typography>
                    <Typography variant="body2">
                      {evolution.right_near_vision || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Visión Cercana:</Typography>
                    <Typography variant="body2">
                      {evolution.left_near_vision || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  {/* Second row: Right eye measurements */}
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Esfera:</Typography>
                    <Typography variant="body2">
                      {evolution.right_eye_sphere || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Cilindro:</Typography>
                    <Typography variant="body2">
                      {evolution.right_eye_cylinder || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Eje:</Typography>
                    <Typography variant="body2">
                      {evolution.right_eye_axis || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OD Agudeza Visual:</Typography>
                    <Typography variant="body2">
                      {evolution.right_eye_visual_acuity || '-'}
                    </Typography>
                  </Grid>

                  {/* Third row: Left eye measurements */}
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Esfera:</Typography>
                    <Typography variant="body2">
                      {evolution.left_eye_sphere || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Cilindro:</Typography>
                    <Typography variant="body2">
                      {evolution.left_eye_cylinder || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Eje:</Typography>
                    <Typography variant="body2">
                      {evolution.left_eye_axis || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2">OI Agudeza Visual:</Typography>
                    <Typography variant="body2">
                      {evolution.left_eye_visual_acuity || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </AccordionDetails>
        </Accordion>
      ))}

      {pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default ClinicalEvolutionsList; 