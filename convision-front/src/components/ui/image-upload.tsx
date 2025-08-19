import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onImageCapture: (file: File) => void;
  onImageRemove?: () => void;
  defaultImage?: string;
  imageUrl?: string;
  isUploading?: boolean;
  accept?: string;
  maxSizeMB?: number;
  containerClassName?: string;
  imageClassName?: string;
}

export function ImageUpload({
  onImageCapture,
  onImageRemove,
  defaultImage,
  imageUrl,
  isUploading = false,
  accept = "image/jpeg, image/png, image/jpg",
  maxSizeMB = 2,
  containerClassName,
  imageClassName,
  className,
  ...props
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    imageUrl || defaultImage || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const maxSizeBytes = maxSizeMB * 1024 * 1024; // convert MB to bytes

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleFile = (file?: File) => {
    if (!file) return;

    if (file.size > maxSizeBytes) {
      alert(`El archivo es demasiado grande. El tamaño máximo es ${maxSizeMB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    onImageCapture(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      // Create a File from the blob
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      
      // Create preview URL
      const imageUrl = URL.createObjectURL(blob);
      setPreviewUrl(imageUrl);
      
      // Send file to parent component
      onImageCapture(file);
      
      // Stop camera
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  // Use effect to ensure proper video element setup when stream is available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Ensure video plays once metadata is loaded
      const playVideo = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(error => {
            console.error("Error playing video:", error);
          });
        }
      };
      
      if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        playVideo();
      } else {
        videoRef.current.addEventListener('loadedmetadata', playVideo);
        return () => {
          videoRef.current?.removeEventListener('loadedmetadata', playVideo);
        };
      }
    }
  }, [stream]);

  return (
    <div 
      className={cn("flex flex-col items-center gap-2", className)} 
      {...props}
    >
      {isCapturing ? (
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted
            className="rounded-md border"
            style={{ maxWidth: '100%', width: '300px', height: '300px', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="flex justify-center gap-2 mt-2">
            <Button variant="outline" type="button" onClick={stopCamera}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button type="button" onClick={captureImage}>
              <Camera className="h-4 w-4 mr-1" /> Capturar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {previewUrl ? (
            <div className={cn("relative", containerClassName)}>
              <img 
                src={previewUrl} 
                alt="Vista previa de imagen" 
                className={cn(
                  "rounded-md border object-cover", 
                  imageClassName ? imageClassName : "w-[300px] h-[300px]"
                )} 
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                aria-label="Eliminar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className={cn(
              "flex flex-col items-center justify-center border border-dashed rounded-md cursor-pointer hover:border-primary/80 transition-colors", 
              containerClassName ? containerClassName : "w-[300px] h-[300px]"
            )}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden"
                id="image-upload"
              />
              <div className="flex flex-col items-center gap-2 p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Haz clic para subir o arrastra y suelta
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  JPEG, PNG, JPG (máx {maxSizeMB}MB)
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            {!previewUrl && (
              <>
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Subir Imagen
                </Button>
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={startCamera}
                  disabled={isUploading}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Tomar Foto
                </Button>
              </>
            )}
            {previewUrl && onImageRemove && (
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
} 