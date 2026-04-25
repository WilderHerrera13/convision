import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ApproveModalProps {
  open: boolean;
  isPending: boolean;
  orderNumber: string;
  patientName: string;
  laboratoryName: string;
  onCancel: () => void;
  onConfirm: (comment: string) => void;
}

const ApproveModal: React.FC<ApproveModalProps> = ({
  open,
  isPending,
  orderNumber,
  patientName,
  laboratoryName,
  onCancel,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    onConfirm(comment);
    setComment('');
  };

  const handleCancel = () => {
    setComment('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#121215]">
            Confirmar aprobación
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-[#7d7d87]">
            Estás aprobando la orden{' '}
            <span className="font-semibold text-[#121215]">#{orderNumber}</span> del paciente{' '}
            <span className="font-semibold text-[#121215]">{patientName}</span> fabricada en{' '}
            <span className="font-semibold text-[#121215]">{laboratoryName}</span>. Esta acción la marcará como lista para entrega.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#7d7d87]">Comentario adicional (opcional)</label>
            <Textarea
              placeholder="Ej. Revisión completada sin observaciones."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="text-[13px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[13px] border-[#e5e5e9]"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#0f8f64] hover:bg-[#0a7050] text-white text-[13px]"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Procesando...' : 'Confirmar aprobación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveModal;
