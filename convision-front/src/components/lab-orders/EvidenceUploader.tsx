import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera, ImagePlus, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  laboratoryOrderService,
  LaboratoryEvidenceTransition,
  LaboratoryOrderEvidence,
} from '@/services/laboratoryOrderService';
import { cn } from '@/lib/utils';

const MAX_EVIDENCE_PHOTOS = 4;

function resolveEvidenceUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export interface EvidenceUploaderProps {
  orderId: number;
  transitionType: LaboratoryEvidenceTransition;
  onUploaded?: (imageUrl: string) => void;
}

const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({ orderId, transitionType, onUploaded }) => {
  const [items, setItems] = useState<LaboratoryOrderEvidence[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const count = items.length;
  const atLimit = count >= MAX_EVIDENCE_PHOTOS;

  const load = useCallback(() => {
    setLoadingList(true);
    laboratoryOrderService
      .getLaboratoryOrderEvidence(orderId, transitionType)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoadingList(false));
  }, [orderId, transitionType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!capturedBlob) {
      setCapturePreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(capturedBlob);
    setCapturePreviewUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [capturedBlob]);

  useEffect(() => {
    if (!pendingFile) {
      setFilePreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setFilePreviewUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [pendingFile]);

  const runUpload = async (file: File | Blob, filename?: string): Promise<boolean> => {
    if (items.length >= MAX_EVIDENCE_PHOTOS) {
      toast({ title: 'Límite alcanzado', description: `Solo se permiten ${MAX_EVIDENCE_PHOTOS} fotos por etapa.`, variant: 'destructive' });
      return false;
    }
    setUploading(true);
    try {
      const ev = await laboratoryOrderService.uploadLaboratoryOrderEvidence(orderId, transitionType, file, filename);
      setItems((prev) => [ev, ...prev]);
      onUploaded?.(ev.image_url);
      toast({ title: 'Evidencia guardada' });
      return true;
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : 'No se pudo subir la imagen.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const pickFileForReview = (files: FileList | null) => {
    if (atLimit) {
      toast({ title: 'Límite alcanzado', description: `Ya tiene ${MAX_EVIDENCE_PHOTOS} fotos en esta etapa.`, variant: 'destructive' });
      return;
    }
    const f = files?.[0];
    if (!f || !f.type.startsWith('image/')) {
      toast({ title: 'Archivo no válido', description: 'Seleccione una imagen.', variant: 'destructive' });
      return;
    }
    setPendingFile(f);
  };

  const cancelFileReview = () => {
    setPendingFile(null);
  };

  const confirmFileUpload = async () => {
    if (!pendingFile) return;
    const ok = await runUpload(pendingFile);
    if (ok) setPendingFile(null);
  };

  useEffect(() => {
    if (!cameraOpen || !stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => {});
  }, [cameraOpen, stream]);

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCapturedBlob(null);
  };

  const openCamera = async () => {
    if (atLimit) {
      toast({ title: 'Límite alcanzado', description: `Ya tiene ${MAX_EVIDENCE_PHOTOS} fotos en esta etapa.`, variant: 'destructive' });
      return;
    }
    setCapturedBlob(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(s);
      setCameraOpen(true);
    } catch {
      toast({ title: 'Cámara no disponible', description: 'Permita el acceso a la cámara o use subida de archivo.', variant: 'destructive' });
    }
  };

  const takeSnapshot = () => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || v.videoWidth === 0) return;
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) setCapturedBlob(blob);
      },
      'image/jpeg',
      0.88
    );
  };

  const cancelCameraPreview = () => {
    setCapturedBlob(null);
  };

  const closeCameraDialog = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const confirmCapture = async () => {
    if (!capturedBlob) return;
    const ok = await runUpload(capturedBlob, 'evidence-camara.jpg');
    if (ok) {
      stopCamera();
      setCameraOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-[#0f0f12]">
          Fotos de evidencia:{' '}
          <span className={cn('font-semibold', atLimit ? 'text-amber-700' : 'text-[#8753ef]')}>
            {count} / {MAX_EVIDENCE_PHOTOS}
          </span>
        </p>
        {atLimit ? <span className="text-xs text-[#7d7d87]">Límite de fotos alcanzado para esta etapa.</span> : null}
      </div>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className={cn('grid w-full max-w-md grid-cols-2 h-10 bg-[#f5f5f6] p-1', atLimit && 'opacity-50 pointer-events-none')}>
          <TabsTrigger value="file" className="data-[state=active]:bg-white data-[state=active]:text-[#8753ef] data-[state=active]:shadow-sm text-sm">
            <Upload className="h-3.5 w-3.5 mr-1.5 inline" />
            Subir archivo
          </TabsTrigger>
          <TabsTrigger value="camera" className="data-[state=active]:bg-white data-[state=active]:text-[#8753ef] data-[state=active]:shadow-sm text-sm">
            <Camera className="h-3.5 w-3.5 mr-1.5 inline" />
            Cámara
          </TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={atLimit}
            onChange={(e) => {
              pickFileForReview(e.target.files);
              e.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (atLimit) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => !uploading && !atLimit && fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!atLimit) setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (!uploading && !atLimit) pickFileForReview(e.dataTransfer.files);
            }}
            className={cn(
              'rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              atLimit ? 'cursor-not-allowed opacity-50 border-[#e5e5e9] bg-[#fafafa]' : 'cursor-pointer',
              !atLimit && dragActive ? 'border-[#8753ef] bg-[#f1edff]' : !atLimit && 'border-[#e5e5e9] bg-[#fafafa] hover:border-[#c4b5fd] hover:bg-[#f9f7ff]',
              uploading && 'pointer-events-none opacity-60'
            )}
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 mx-auto text-[#8753ef] animate-spin" />
            ) : (
              <ImagePlus className="h-10 w-10 mx-auto text-[#8753ef] opacity-90" />
            )}
            <p className="mt-3 text-sm font-medium text-[#0f0f12]">Arrastre una imagen aquí o haga clic para elegir</p>
            <p className="mt-1 text-xs text-[#7d7d87]">Revise la vista previa antes de subir · hasta {MAX_EVIDENCE_PHOTOS} fotos · máx. 8 MB</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 border-[#8753ef] text-[#8753ef] hover:bg-[#f1edff]"
              disabled={uploading || atLimit}
            >
              Seleccionar imagen
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="camera" className="mt-4">
          <div className="rounded-xl border border-[#e5e5e9] bg-[#fafafa] p-6 text-center">
            <Camera className="h-10 w-10 mx-auto text-[#8753ef]" />
            <p className="mt-3 text-sm font-medium text-[#0f0f12]">Capture una foto como evidencia</p>
            <p className="mt-1 text-xs text-[#7d7d87] mb-4">Podrá revisarla y volver a tomarla antes de guardarla</p>
            <Button type="button" size="sm" className="bg-[#8753ef] hover:bg-[#7040d6] text-white" onClick={openCamera} disabled={uploading || atLimit}>
              Abrir cámara
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!pendingFile} onOpenChange={(open) => !open && cancelFileReview()}>
        <DialogContent className="sm:max-w-lg border-[#e5e5e9]">
          <DialogHeader>
            <DialogTitle className="text-[#0f0f12]">Revisar imagen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7d7d87]">Confirme si desea guardar esta foto como evidencia, elija otra o cancele.</p>
          <div className="rounded-lg overflow-hidden border border-[#e5e5e9] bg-[#0f0f12] min-h-[200px]">
            {filePreviewUrl ? <img src={filePreviewUrl} alt="" className="w-full max-h-[360px] object-contain mx-auto" /> : null}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={cancelFileReview} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                cancelFileReview();
                setTimeout(() => fileInputRef.current?.click(), 0);
              }}
              disabled={uploading}
            >
              Elegir otra
            </Button>
            <Button type="button" className="bg-[#8753ef] hover:bg-[#7040d6] text-white" onClick={() => void confirmFileUpload()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir esta foto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cameraOpen}
        onOpenChange={(open) => {
          if (!open) closeCameraDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg border-[#e5e5e9]">
          <DialogHeader>
            <DialogTitle className="text-[#0f0f12]">Capturar evidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!capturedBlob ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden border border-[#e5e5e9]">
                {capturePreviewUrl ? (
                  <img src={capturePreviewUrl} alt="" className="w-full max-h-[320px] object-contain bg-[#0f0f12]" />
                ) : null}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            {!capturedBlob ? (
              <>
                <Button type="button" variant="outline" onClick={closeCameraDialog}>
                  Cancelar
                </Button>
                <Button type="button" className="bg-[#8753ef] hover:bg-[#7040d6] text-white" onClick={takeSnapshot}>
                  Capturar foto
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={closeCameraDialog}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline" onClick={cancelCameraPreview}>
                  Tomar otra
                </Button>
                <Button type="button" className="bg-[#8753ef] hover:bg-[#7040d6] text-white" onClick={() => void confirmCapture()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir esta foto'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loadingList ? (
        <p className="text-xs text-[#7d7d87]">Cargando evidencias…</p>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#7d7d87] uppercase tracking-wide">Guardadas en esta etapa</p>
          <ul className="flex flex-wrap gap-3">
            {items.map((ev) => (
              <li key={ev.id} className="relative group rounded-lg border border-[#ebebee] overflow-hidden w-24 h-24 bg-[#f5f5f6]">
                <a href={resolveEvidenceUrl(ev.image_url)} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  <img src={resolveEvidenceUrl(ev.image_url)} alt="" className="w-full h-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default EvidenceUploader;
