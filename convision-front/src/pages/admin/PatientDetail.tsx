import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

const PatientDetail = () => {
  const [patientId, setPatientId] = useState('');

  return (
    <div>
      {/* In the buttons section near the top of the component, add a Clinical History button */}
      <Button
        variant="contained"
        color="info"
        startIcon={<AssignmentIcon />}
        component={Link}
        to={`/admin/patients/${patientId}/history`}
        sx={{ ml: 1 }}
      >
        Historia Clínica
      </Button>
    </div>
  );
};

export default PatientDetail; 