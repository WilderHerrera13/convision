import React from 'react';
import { Box, Button, ButtonGroup, Tooltip } from '@mui/material';
import { Edit, PictureAsPdf, Share, Email } from '@mui/icons-material';
import PDFLinkButton from './PDFLinkButton';
import { ClinicalHistory } from '@/services/clinicalHistoryService';

interface ClinicalHistoryActionsProps {
  clinicalHistory: ClinicalHistory;
  onEdit?: () => void;
  compact?: boolean;
}

/**
 * Action buttons for a clinical history including PDF download
 */
const ClinicalHistoryActions: React.FC<ClinicalHistoryActionsProps> = ({
  clinicalHistory,
  onEdit,
  compact = false,
}) => {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  // Handle sharing the PDF URL via clipboard
  const handleShare = () => {
    const pdfUrl = `${baseUrl}/api/v1/guest/clinical-histories/${clinicalHistory.id}/pdf?token=${clinicalHistory.pdf_token}`;
    navigator.clipboard.writeText(pdfUrl)
      .then(() => {
        alert('¡URL del PDF copiada al portapapeles!');
      })
      .catch(err => {
        console.error('Error copiando al portapapeles: ', err);
        alert('Error al copiar URL. Por favor, inténtalo de nuevo.');
      });
  };

  // Handle sending the PDF via email
  const handleEmailShare = () => {
    const pdfUrl = `${baseUrl}/api/v1/guest/clinical-histories/${clinicalHistory.id}/pdf?token=${clinicalHistory.pdf_token}`;
    const subject = `Historia Clínica - ${clinicalHistory.patient?.full_name || 'Paciente'}`;
    const body = `Hola,\n\nAquí está el enlace para acceder a la historia clínica: ${pdfUrl}\n\nEste enlace es válido por 60 minutos.\n\nSaludos,\nConvision.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (compact) {
    // Compact version (for tables or lists)
    return (
      <ButtonGroup size="small" variant="outlined">
        {onEdit && (
          <Tooltip title="Editar historia clínica">
            <Button onClick={onEdit}>
              <Edit fontSize="small" />
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Descargar PDF">
          <Box component="span">
            <PDFLinkButton
              label=""
              pdfToken={clinicalHistory.pdf_token || ''}
              url={`${baseUrl}/api/v1/guest/clinical-histories/${clinicalHistory.id}/pdf`}
              fileName={`historia-clinica-${clinicalHistory.patient?.identification_number || clinicalHistory.id}.pdf`}
              variant="outlined"
              size="small"
            />
          </Box>
        </Tooltip>
        <Tooltip title="Compartir URL">
          <Button onClick={handleShare}>
            <Share fontSize="small" />
          </Button>
        </Tooltip>
        <Tooltip title="Enviar por correo">
          <Button onClick={handleEmailShare}>
            <Email fontSize="small" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    );
  }

  // Full version (for detail pages)
  return (
    <Box sx={{ display: 'flex', gap: 2, my: 2, flexWrap: 'wrap' }}>
      {onEdit && (
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={onEdit}
        >
          Editar Historia
        </Button>
      )}
      <PDFLinkButton
        label="Descargar PDF"
        pdfToken={clinicalHistory.pdf_token || ''}
        url={`${baseUrl}/api/v1/guest/clinical-histories/${clinicalHistory.id}/pdf`}
        fileName={`historia-clinica-${clinicalHistory.patient?.identification_number || clinicalHistory.id}.pdf`}
        variant="contained"
      />
      <Button
        variant="outlined"
        startIcon={<Share />}
        onClick={handleShare}
      >
        Compartir URL
      </Button>
      <Button
        variant="outlined"
        startIcon={<Email />}
        onClick={handleEmailShare}
      >
        Enviar por correo
      </Button>
    </Box>
  );
};

export default ClinicalHistoryActions; 