import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReturnModalProps {
  open: boolean;
  isPending: boolean;
  defectType: string;
  observations: string;
  onDefectTypeChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const DEFECT_OPTIONS = [
  { value: 'Graduación incorrecta', label: 'Graduación incorrecta' },
  { value: 'Rayado o daño físico', label: 'Rayado o daño físico' },
  { value: 'Distorsión o aberración', label: 'Distorsión o aberración' },
  { value: 'Error en tratamiento', label: 'Error en tratamiento' },
  { value: 'Otro', label: 'Otro' },
];

const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  isPending,
  defectType,
  observations,
  onDefectTypeChange,
  onObservationsChange,
  onCancel,
  onConfirm,
}) => {
  const isConfirmDisabled = isPending || !defectType;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#ffeeed]">
              <AlertCircle className="size-5 text-[#b82626]" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-convision-text">
              Confirmar retorno al laboratorio
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-5 pt-1">
          <p className="text-[13px] text-convision-text-secondary leading-relaxed">
            ¿Estás seguro de que deseas retornar esta orden? Se notificará al laboratorio para que rehaga los lentes.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-convision-text">
              Tipo de defecto <span className="text-[#b82626]">*</span>
            </Label>
            <Select value={defectType} onValueChange={onDefectTypeChange} disabled={isPending}>
              <SelectTrigger className="text-[13px]">
                <SelectValue placeholder="Seleccionar tipo de defecto" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200]">
                {DEFECT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-[13px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-convision-text">
              Observaciones
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => onObservationsChange(e.target.value)}
              rows={3}
              disabled={isPending}
              className="text-[13px]"
            />
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
              className="bg-[#b82626] hover:bg-[#9e1f1f] text-white text-[13px] min-w-[160px]"
              onClick={onConfirm}
              disabled={isConfirmDisabled}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Retornando...
                </span>
              ) : (
                'Confirmar retorno'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnModal;
