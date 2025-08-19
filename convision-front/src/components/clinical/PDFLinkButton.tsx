import React from 'react';
import { Button } from '@mui/material';
import { OpenInNew, Download } from '@mui/icons-material';

interface PDFLinkButtonProps {
  label: string;
  pdfToken: string;
  url: string;
  fileName: string;
  openInNewTab?: boolean;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  onClick?: () => void;
}

/**
 * A reusable button component for accessing PDFs with secure tokens
 */
const PDFLinkButton: React.FC<PDFLinkButtonProps> = ({
  label,
  pdfToken,
  url,
  fileName,
  openInNewTab = false,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  onClick,
}) => {
  const handleClick = () => {
    // If custom click handler is provided, call it
    if (onClick) {
      onClick();
      return;
    }

    // If URL doesn't already have the token, add it
    const fullUrl = url.includes('token=') ? url : `${url}?token=${pdfToken}`;

    if (openInNewTab) {
      // Open in new tab
      window.open(fullUrl, '_blank');
    } else {
      // Download the file
      downloadPdf(fullUrl, fileName);
    }
  };

  /**
   * Helper function to download a PDF from a URL
   */
  const downloadPdf = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get the blob directly from the response
      const blob = await response.blob();
      
      // Create object URL
      const objectUrl = window.URL.createObjectURL(blob);
      
      // Create invisible iframe for download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Write content to iframe and trigger download
      iframe.contentWindow?.document.write(
        `<a id="download" href="${objectUrl}" download="${fileName}"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      onClick={handleClick}
      startIcon={openInNewTab ? <OpenInNew /> : <Download />}
    >
      {label}
    </Button>
  );
};

export default PDFLinkButton; 