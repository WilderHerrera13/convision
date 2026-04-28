import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';

interface DigitalSignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (professionalTp: string) => Promise<void>;
  isSigning?: boolean;
  defaultTp?: string;
}

export function DigitalSignatureModal({ open, onClose, onConfirm, isSigning, defaultTp }: DigitalSignatureModalProps) {
  const [tp, setTp] = useState(defaultTp || '');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setTp(defaultTp || '');
      setConfirmed(false);
    }
  }, [open, defaultTp]);

  const canSign = tp.trim().length >= 4 && confirmed;

  const handleConfirm = async () => {
    if (!canSign) return;
    await onConfirm(tp.trim());
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Firmar fórmula óptica</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#eff1ff] border border-[#3a71f7] rounded-lg p-3 text-sm text-[#0f0f12]">
            Al firmar, la fórmula quedará registrada como documento legal según la{' '}
            <strong>Ley 650/2001 Art. 24</strong>. Esta acción no puede deshacerse.
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f0f12] mb-1">
              Tarjeta Profesional CTNPO
            </label>
            <Input
              value={tp}
              onChange={e => setTp(e.target.value)}
              placeholder="CTNPO-XXXX"
              className="font-mono"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="sign-consent"
              checked={confirmed}
              onCheckedChange={v => setConfirmed(!!v)}
            />
            <label htmlFor="sign-consent" className="text-xs text-[#0f0f12] cursor-pointer leading-relaxed">
              Confirmo que la información es correcta y autorizo mi firma digital
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSigning}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSign || isSigning}
            className="flex-1 bg-[#0f8f64] text-white hover:bg-[#0a7050]"
          >
            {isSigning ? 'Firmando...' : 'Firmar y completar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
