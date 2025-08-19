import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import DrawableCanvas, { DrawingPath } from './drawable-canvas';
import { FileImage } from 'lucide-react';

interface DrawableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (previewDataUrl: string, pathsJson?: string) => void;
  imageUrl: string;
  title?: string;
  description?: string;
  initialPaths?: DrawingPath[];
}

const DrawableModal: React.FC<DrawableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  imageUrl,
  title = "Anotar sobre Imagen de Lentes",
  description = "Utilice las herramientas de dibujo para hacer anotaciones sobre la imagen de los lentes como parte de la prescripción.",
  initialPaths,
}) => {
  const handleSaveAnnotationFromCanvas = (pathsJson: string, previewDataUrl: string) => {
    onSave(previewDataUrl, pathsJson);
    toast({
      title: "Anotación Guardada",
      description: "Las anotaciones han sido guardadas y están listas para adjuntar a la prescripción.",
      variant: "default",
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-6xl w-[90vw] h-[85vh] flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="px-5 py-3 border-b border-gray-200 bg-white">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <FileImage className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-600 mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <DrawableCanvas
            imageUrl={imageUrl}
            onSaveAnnotation={handleSaveAnnotationFromCanvas}
            initialPaths={initialPaths}
            width={800}
            height={600}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DrawableModal; 