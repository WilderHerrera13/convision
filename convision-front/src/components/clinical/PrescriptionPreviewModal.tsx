import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import type { PrescriptionInput, DiagnosisInput } from '@/services/clinicalRecordService';

interface ClinicInfo {
  name: string;
  reps_number: string;
  address: string;
  logo_url?: string;
}

interface PatientInfo {
  name: string;
  id_number: string;
  age: number;
  date: string;
}

interface ProfessionalInfo {
  name: string;
  specialty: string;
}

interface PrescriptionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmSign: (professionalTp: string) => Promise<void>;
  isSigning?: boolean;
  clinic: ClinicInfo;
  patient: PatientInfo;
  professional: ProfessionalInfo;
  prescription: Partial<PrescriptionInput>;
  diagnosis: Pick<DiagnosisInput, 'primary_code' | 'primary_description'>;
  validUntil: string;
  cups: string;
}

function formatOptical(v?: number): string {
  if (v === undefined || v === null) return '—';
  if (v === 0) return 'Plano';
  return (v > 0 ? '+' : '') + v.toFixed(2);
}

export function PrescriptionPreviewModal({
  open,
  onClose,
  onConfirmSign,
  isSigning,
  clinic,
  patient,
  professional,
  prescription,
  diagnosis,
  validUntil,
  cups,
}: PrescriptionPreviewModalProps) {
  const [showSignature, setShowSignature] = useState(false);

  const handleConfirmSign = async (tp: string) => {
    await onConfirmSign(tp);
    setShowSignature(false);
  };

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #prescription-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa — Fórmula Óptica</DialogTitle>
          </DialogHeader>

          <div id="prescription-print-area" className="bg-white p-8 font-serif text-[#0f0f12] border border-[#e5e5e9] rounded-lg">
            <div className="flex items-center justify-between border-b-2 border-[#0f8f64] pb-4 mb-6">
              {clinic.logo_url && <img src={clinic.logo_url} className="h-12 object-contain" alt="Logo" />}
              <div className={clinic.logo_url ? 'text-right' : 'ml-auto text-right'}>
                <p className="font-bold text-lg text-[#0f8f64]">{clinic.name}</p>
                <p className="text-sm text-[#7d7d87]">REPS: {clinic.reps_number}</p>
                <p className="text-sm text-[#7d7d87]">{clinic.address}</p>
              </div>
            </div>

            <h1 className="text-center text-xl font-bold uppercase tracking-wide mb-2">
              FÓRMULA ÓPTICA
            </h1>
            <p className="text-xs text-center text-[#7d7d87] mb-6">
              Ley 650/2001 Art. 24 — Documento con validez legal
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#f5f5f6] rounded-lg">
              <div>
                <p className="text-xs text-[#7d7d87] uppercase font-semibold">Paciente</p>
                <p className="font-semibold">{patient.name}</p>
                <p className="text-sm text-[#7d7d87]">C.C. {patient.id_number} · {patient.age} años</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#7d7d87] uppercase font-semibold">Fecha</p>
                <p className="font-semibold">{patient.date}</p>
                <p className="text-sm text-[#7d7d87]">CUPS: {cups}</p>
              </div>
            </div>

            <table className="w-full border-collapse mb-6 text-sm">
              <thead>
                <tr className="bg-[#0f8f64] text-white">
                  <th className="p-2 text-left">Ojo</th>
                  <th className="p-2 text-center">Esférico</th>
                  <th className="p-2 text-center">Cilindro</th>
                  <th className="p-2 text-center">Eje</th>
                  <th className="p-2 text-center">AV cc</th>
                  <th className="p-2 text-center">Adición</th>
                  <th className="p-2 text-center">D.P.</th>
                </tr>
              </thead>
              <tbody>
                {(['od', 'oi'] as const).map(eye => (
                  <tr key={eye} className="border-b border-[#e5e5e9]">
                    <td className="p-2 font-bold">{eye.toUpperCase()}</td>
                    <td className="p-2 text-center">{formatOptical(prescription[`sph_${eye}`])}</td>
                    <td className="p-2 text-center">{formatOptical(prescription[`cyl_${eye}`])}</td>
                    <td className="p-2 text-center">{prescription[`axis_${eye}`] != null ? `${prescription[`axis_${eye}`]}°` : '—'}</td>
                    <td className="p-2 text-center">{prescription[`avcc_${eye}`] || '—'}</td>
                    <td className="p-2 text-center">{formatOptical(prescription[`add_${eye}`])}</td>
                    <td className="p-2 text-center">{prescription[`dp_${eye}`] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-[#7d7d87] uppercase font-semibold mb-1">Tipo de lente</p>
                <p className="text-sm">
                  {[prescription.lens_type, prescription.lens_material, prescription.lens_use].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7d7d87] uppercase font-semibold mb-1">Tratamientos</p>
                <p className="text-sm">{(prescription.treatments || []).join(', ') || 'Sin tratamientos'}</p>
              </div>
            </div>

            <div className="mb-6 p-3 bg-[#eff1ff] rounded-lg">
              <p className="text-xs text-[#7d7d87] uppercase font-semibold mb-1">Diagnóstico CIE-10</p>
              <p className="text-sm">
                <span className="font-mono font-bold text-[#3a71f7]">{diagnosis.primary_code}</span>
                {' — '}
                {diagnosis.primary_description}
              </p>
            </div>

            <div className="mb-6 p-3 bg-[#e5f6ef] border border-[#effcf5] rounded-lg">
              <p className="text-xs text-[#7d7d87] uppercase font-semibold mb-1">Vigencia</p>
              <p className="font-semibold text-[#0f8f64]">Válida hasta: {validUntil}</p>
              <p className="text-xs text-[#7d7d87]">Decreto 2200/2005 — Vigencia máxima 12 meses</p>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-[#0f0f12]">
              <p className="font-bold text-center">{professional.name}</p>
              <p className="text-sm text-center text-[#7d7d87]">{professional.specialty}</p>
              <p className="text-xs text-center text-[#7d7d87]">T.P. CTNPO: _________________</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
              🖨 Imprimir
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
            <Button
              onClick={() => setShowSignature(true)}
              className="bg-[#0f8f64] text-white hover:bg-[#0a7050]"
            >
              Firmar y completar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DigitalSignatureModal
        open={showSignature}
        onClose={() => setShowSignature(false)}
        onConfirm={handleConfirmSign}
        isSigning={isSigning}
      />
    </>
  );
}
