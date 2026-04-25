import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFECT_TYPES = [
  'Defecto superficial — raya / burbuja / arco',
  'Graduación incorrecta',
  'Error en tratamiento (AR, UV, tinte)',
  'Distorsión o aberración',
  'Montaje incorrecto',
  'Otro',
];

interface ReturnModalProps {
  open: boolean;
  isPending: boolean;
  orderNumber: string;
  patientName: string;
  laboratoryName: string;
  defectType: string;
  observations: string;
  onDefectTypeChange: (v: string) => void;
  onObservationsChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  isPending,
  orderNumber,
  patientName,
  laboratoryName,
  defectType,
  observations,
  onDefectTypeChange,
  onObservationsChange,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#121215]">
            Retornar al laboratorio
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-[#7d7d87]">
            Estás retornando la orden{' '}
            <span className="font-semibold text-[#121215]">#{orderNumber}</span> del paciente{' '}
            <span className="font-semibold text-[#121215]">{patientName}</span> a{' '}
            <span className="font-semibold text-[#121215]">{laboratoryName}</span>. El laboratorio será notificado.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#7d7d87]">
              Tipo de defecto <span className="text-[#b82626]">*</span>
            </label>
            <Select value={defectType} onValueChange={onDefectTypeChange}>
              <SelectTrigger className="text-[13px]">
                <SelectValue placeholder="Selecciona el tipo de defecto" />
              </SelectTrigger>
              <SelectContent>
                {DEFECT_TYPES.map((d) => (
                  <SelectItem key={d} value={d} className="text-[13px]">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-[#7d7d87]">
              Descripción del problema <span className="text-[#b82626]">*</span>
            </label>
            <Textarea
              placeholder="Describe el defecto encontrado con el mayor detalle posible..."
              value={observations}
              onChange={(e) => onObservationsChange(e.target.value)}
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
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-[#b82626] hover:bg-[#9b1f1f] text-white text-[13px]"
            onClick={onConfirm}
            disabled={isPending || !defectType || !observations.trim()}
          >
            {isPending ? 'Procesando...' : 'Confirmar retorno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnModal;
