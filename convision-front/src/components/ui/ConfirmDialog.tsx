import React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  isLoading?: boolean;
}

const VARIANT_STYLES = {
  danger: 'bg-[#b82626] hover:bg-[#991f1f] text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  default: 'bg-[#3a71f7] hover:bg-[#2d5dcc] text-white',
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[320px] gap-0 overflow-hidden rounded-[8px] border border-[#e0e0e5] p-0 shadow-[0_4px_16px_rgba(18,18,19,0.12)] [&>button:last-of-type]:hidden"
      >
        <DialogHeader className="flex-row items-center justify-between border-b border-[#e0e0e5] px-4 py-4">
          <DialogTitle className="text-[14px] font-semibold text-[#121213]">
            {title}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[#7d7d87] transition-colors hover:text-[#121213]"
            aria-label="Cerrar"
          >
            <X className="h-[10px] w-[10px]" strokeWidth={2.5} />
          </button>
        </DialogHeader>

        <DialogDescription
          asChild
        >
          <p className="px-4 py-4 text-[12px] leading-relaxed text-[#7d7d87]">
            {description}
          </p>
        </DialogDescription>

        <div className="flex items-center justify-end gap-2 border-t border-[#e0e0e5] px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-[6px] bg-[#f5f5f7] px-5 text-[12px] font-medium text-[#121213] hover:bg-[#e8e8ec]"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            className={`h-8 rounded-[6px] px-5 text-[12px] font-medium ${VARIANT_STYLES[variant]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
