import React from 'react';
import { 
  Card, CardContent, Typography, Grid, Chip, 
  Box, Stack, Divider, Avatar 
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { patientService } from '@/services/patientService';

interface PatientInfoProps {
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    identification?: string;
    identification_type?: string;
    birth_date?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    status: string;
    profile_image?: string | null;
  };
}

const PatientInfo: React.FC<PatientInfoProps> = ({ patient }) => {
  // Calculate age if birth_date is available
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  };

  // Get profile image URL
  const profileImageUrl = patient.profile_image
    ? patientService.getProfileImageUrl(patient.profile_image)
    : null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar 
              src={profileImageUrl || undefined}
              sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}
            >
              {!profileImageUrl && <Person fontSize="large" />}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6">
                {`${patient.first_name} ${patient.last_name}`}
              </Typography>
              <Chip 
                size="small"
                label={patient.status === 'active' ? 'Activo' : 'Inactivo'} 
                color={patient.status === 'active' ? 'success' : 'error'}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {patient.identification_type && patient.identification
                ? `${patient.identification_type.toUpperCase()}: ${patient.identification}`
                : 'Sin identificación registrada'}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Información de Contacto
            </Typography>
            <Box mt={1}>
              <Typography variant="body2">
                <strong>Email:</strong> {patient.email || 'No registrado'}
              </Typography>
              <Typography variant="body2">
                <strong>Teléfono:</strong> {patient.phone || 'No registrado'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Datos Personales
            </Typography>
            <Box mt={1}>
              <Typography variant="body2">
                <strong>Género:</strong> {patient.gender 
                  ? patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'
                  : 'No registrado'}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha Nacimiento:</strong> {patient.birth_date 
                  ? `${new Date(patient.birth_date).toLocaleDateString()} (${calculateAge(patient.birth_date)} años)`
                  : 'No registrada'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Dirección
            </Typography>
            <Box mt={1}>
              <Typography variant="body2">
                {patient.address ? patient.address : 'No registrada'}
              </Typography>
              <Typography variant="body2">
                {patient.city || patient.state || patient.postal_code ? 
                  `${patient.city || ''} ${patient.state || ''} ${patient.postal_code || ''}` : ''}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PatientInfo; 