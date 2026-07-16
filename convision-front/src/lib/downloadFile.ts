/**
 * Dispara la descarga de un Blob binario (Excel, PDF, CSV, …) en el navegador.
 * Reutilizable por cualquier feature que exporte archivos generados por el backend.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
