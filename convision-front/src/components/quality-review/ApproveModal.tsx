import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ApproveModalProps {
  open: boolean;
  isPending: boolean;
  notifyPatient: boolean;
  onNotifyPatientChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const ApproveModal: React.FC<ApproveModalProps> = ({
  open,
  isPending,
  notifyPatient,
  onNotifyPatientChange,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#ebf5ef]">
              <CheckCircle className="size-5 text-[#0f8f64]" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-convision-text">
              Confirmar aprobación
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-5 pt-1">
          <p className="text-[13px] text-convision-text-secondary leading-relaxed">
            ¿Estás seguro de que deseas aprobar esta orden? Los lentes serán marcados como listos para entrega.
          </p>
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="notify-patient"
              checked={notifyPatient}
              onCheckedChange={(checked) => onNotifyPatientChange(checked === true)}
              disabled={isPending}
            />
            <Label
              htmlFor="notify-patient"
              className="text-[13px] text-convision-text cursor-pointer select-none"
            >
              Notificar al paciente
            </Label>
          </div>
          <div className="flex items-center gap-3 justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-[13px]"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-[#0f8f64] hover:bg-[#0a7050] text-white text-[13px] min-w-[160px]"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Confirmando...
                </span>
              ) : (
                'Confirmar aprobación'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveModal;
