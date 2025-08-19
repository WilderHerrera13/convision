import React, { useState, useEffect } from 'react';
import { Spinner } from './spinner';

interface PDFViewerProps {
  url: string;
  title?: string;
  height?: string | number;
  width?: string | number;
}

export function PDFViewer({ url, title, height = '100%', width = '100%' }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading state when URL changes
    setLoading(true);
  }, [url]);

  return (
    <div className="pdf-viewer-container" style={{ height, width, position: 'relative' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Spinner size="lg" />
        </div>
      )}
      <iframe
        src={`${url}#toolbar=1&navpanes=1`}
        title={title || "PDF Viewer"}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
} 