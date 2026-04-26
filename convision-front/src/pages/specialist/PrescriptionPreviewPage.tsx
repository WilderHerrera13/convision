import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getAppointmentById } from '@/services/appointmentService';
import {
  getClinicalRecord,
  signClinicalRecord,
  type ClinicalRecord,
} from '@/services/clinicalRecordService';
import { DigitalSignatureModal } from '@/components/clinical/DigitalSignatureModal';

function formatOptical(v?: number | null): string {
  if (v === undefined || v === null) return '—';
  if (v === 0) return 'Plano';
  return (v > 0 ? '+' : '') + v.toFixed(2);
}

function validUntilDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface SigningPanelProps {
  record: ClinicalRecord;
  professionalName: string;
  onSign: () => void;
  isSigning: boolean;
}

function SigningPanel({ record, professionalName, onSign, isSigning }: SigningPanelProps) {
  const rx = record.prescription;
  const validMonths = rx?.validity_months ?? 12;
  return (
    <div className="w-[320px] shrink-0 flex flex-col gap-4">
      <div className="bg-white border border-[#e5e5e9] rounded-[8px] p-4">
        <p className="text-[12px] font-semibold text-[#121215] mb-3">Estado del documento</p>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-[#fff3cd] text-[#856404] text-[10px] font-semibold rounded-full px-2 py-0.5 border border-[#ffc107]">
            Pendiente de firma
          </span>
        </div>
        <div className="text-[11px] text-[#7d7d87] space-y-1">
          <p>Especialista: <span className="text-[#121215] font-medium">{professionalName}</span></p>
          <p>Vigencia: <span className="text-[#121215] font-medium">{validMonths} meses</span></p>
          <p>Válida hasta: <span className="text-[#0f8f64] font-medium">{validUntilDate(validMonths)}</span></p>
        </div>
      </div>

      <div className="bg-white border border-[#e5e5e9] rounded-[8px] p-4">
        <p className="text-[12px] font-semibold text-[#121215] mb-1">Firma del profesional</p>
        <p className="text-[11px] text-[#7d7d87] mb-3">
          Al firmar, usted certifica que la información es correcta y asume responsabilidad legal por este documento.
        </p>
        <div className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] h-20 flex items-center justify-center mb-3">
          <p className="text-[11px] text-[#b4b5bc]">Área de firma digital</p>
        </div>
        <button
          onClick={onSign}
          disabled={isSigning}
          className="w-full bg-[#0f8f64] text-white h-9 rounded-[6px] text-[13px] font-semibold hover:bg-[#0a7050] transition-colors disabled:opacity-50"
        >
          {isSigning ? 'Firmando...' : 'Firmar y emitir →'}
        </button>
      </div>

      <div className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[8px] p-3 text-[11px] text-[#7d7d87] space-y-1">
        <p className="font-semibold text-[#121215]">Marco legal</p>
        <p>Ley 650/2001 Art. 24 — Fórmula óptica como documento legal</p>
        <p>Decreto 2200/2005 — Vigencia máxima 12 meses</p>
        <p>Res. 2275/2023 — Codificación CIE-10 (RIPS)</p>
      </div>
    </div>
  );
}

interface PrescriptionDocProps {
  record: ClinicalRecord;
  patientName: string;
  patientId: string;
  professionalName: string;
}

function PrescriptionDoc({ record, patientName, patientId, professionalName }: PrescriptionDocProps) {
  const rx = record.prescription;
  const dx = record.diagnosis;

  return (
    <div className="flex-1 bg-white border border-[#e5e5e9] rounded-[8px] overflow-y-auto">
      <div className="p-6 font-serif text-[#0f0f12]">
        <div className="flex items-start justify-between border-b-2 border-[#0f8f64] pb-4 mb-5">
          <div>
            <p className="font-bold text-[16px] text-[#0f8f64]">Convision Óptica</p>
            <p className="text-[11px] text-[#7d7d87]">REPS: N/A</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[15px] uppercase tracking-widest text-[#121215]">FÓRMULA ÓPTICA</p>
            <p className="text-[10px] text-[#7d7d87]">Ley 650/2001 Art. 24 — Documento con validez legal</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-[#f5f5f6] rounded-[6px]">
          <div>
            <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-0.5">Paciente</p>
            <p className="font-semibold text-[13px]">{patientName}</p>
            <p className="text-[11px] text-[#7d7d87]">C.C. {patientId}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-0.5">Fecha</p>
            <p className="font-semibold text-[13px]">{new Date().toLocaleDateString('es-CO')}</p>
            <p className="text-[11px] text-[#7d7d87]">CUPS: 890205</p>
          </div>
        </div>

        <table className="w-full border-collapse mb-5 text-[12px]">
          <thead>
            <tr className="bg-[#0f8f64] text-white">
              <th className="p-2 text-left font-semibold">Ojo</th>
              <th className="p-2 text-center font-semibold">Esférico</th>
              <th className="p-2 text-center font-semibold">Cilindro</th>
              <th className="p-2 text-center font-semibold">Eje</th>
              <th className="p-2 text-center font-semibold">AV c/c</th>
              <th className="p-2 text-center font-semibold">Adición</th>
              <th className="p-2 text-center font-semibold">D.P.</th>
            </tr>
          </thead>
          <tbody>
            {(['od', 'oi'] as const).map(eye => (
              <tr key={eye} className="border-b border-[#e5e5e9]">
                <td className="p-2 font-bold">{eye.toUpperCase()}</td>
                <td className="p-2 text-center">{formatOptical(rx?.[`sph_${eye}`])}</td>
                <td className="p-2 text-center">{formatOptical(rx?.[`cyl_${eye}`])}</td>
                <td className="p-2 text-center">{rx?.[`axis_${eye}`] != null ? `${rx[`axis_${eye}`]}°` : '—'}</td>
                <td className="p-2 text-center">{rx?.[`avcc_${eye}`] || '—'}</td>
                <td className="p-2 text-center">{formatOptical(rx?.[`add_${eye}`])}</td>
                <td className="p-2 text-center">{rx?.[`dp_${eye}`] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-1">Tipo de lente</p>
            <p className="text-[12px]">
              {[rx?.lens_type, rx?.lens_material, rx?.lens_use].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-1">Tratamientos</p>
            <p className="text-[12px]">{(rx?.treatments as string[] | undefined)?.join(', ') || 'Sin tratamientos'}</p>
          </div>
        </div>

        {dx && (
          <div className="mb-5 p-3 bg-[#eff1ff] rounded-[6px]">
            <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-1">Diagnóstico CIE-10</p>
            <p className="text-[12px]">
              <span className="font-mono font-bold text-[#3a71f7]">{dx.primary_code}</span>
              {' — '}
              {dx.primary_description}
            </p>
          </div>
        )}

        <div className="mb-5 p-3 bg-[#e5f6ef] border border-[#0f8f64] rounded-[6px]">
          <p className="text-[9px] uppercase font-semibold text-[#7d7d87] mb-0.5">Vigencia</p>
          <p className="font-semibold text-[#0f8f64] text-[12px]">
            Válida hasta: {validUntilDate(rx?.validity_months ?? 12)}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-[#0f0f12]">
          <p className="font-bold text-center text-[13px]">{professionalName}</p>
          <p className="text-[11px] text-center text-[#7d7d87]">Optómetra</p>
          <p className="text-[10px] text-center text-[#7d7d87] mt-1">
            T.P. CTNPO: {rx?.professional_tp || '_________________'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apptId = parseInt(id || '0');

  const [showSignModal, setShowSignModal] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const { data: appt } = useQuery({
    queryKey: ['appointment', apptId],
    queryFn: () => getAppointmentById(apptId).then(r => r.data),
    enabled: apptId > 0,
  });

  const { data: record } = useQuery({
    queryKey: ['clinical-record', apptId],
    queryFn: () => getClinicalRecord(apptId).then(r => r.data),
    enabled: apptId > 0,
  });

  const handleConfirmSign = async (tp: string) => {
    setIsSigning(true);
    try {
      await signClinicalRecord(apptId, tp);
      queryClient.invalidateQueries({ queryKey: ['appointment', apptId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Consulta completada y firmada correctamente' });
      navigate('/specialist/appointments');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo firmar la consulta.' });
    } finally {
      setIsSigning(false);
      setShowSignModal(false);
    }
  };

  const patient = appt?.patient;
  const patientName =
    patient?.full_name ||
    (patient?.first_name && patient?.last_name ? `${patient.first_name} ${patient.last_name}` : '') ||
    'Paciente';
  const patientId = patient?.id_number || patient?.identification || '';
  const professionalName = user?.name || 'Especialista';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="bg-white border-b border-[#e5e5e9] px-6 h-[52px] flex items-center gap-3 shrink-0">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#7d7d87]">
          <Link to="/specialist/appointments" className="hover:text-[#121215]">Citas</Link>
          <span>/</span>
          <Link to={`/specialist/appointments/${apptId}`} className="hover:text-[#121215]">Historia Clínica</Link>
          <span>/</span>
          <span className="text-[#121215] font-medium">Fórmula Óptica</span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="bg-[#fff3cd] text-[#856404] text-[10px] font-semibold rounded-full px-2.5 py-1 border border-[#ffc107]">
            Pendiente de firma
          </span>
          <button
            onClick={() => window.print()}
            className="border border-[#e0e0e4] bg-white text-[#121215] h-8 px-4 rounded-[6px] text-[12px] font-medium hover:bg-[#f5f5f6] transition-colors"
          >
            Vista previa PDF
          </button>
          <button
            onClick={() => setShowSignModal(true)}
            className="bg-[#0f8f64] text-white h-8 px-4 rounded-[6px] text-[12px] font-semibold hover:bg-[#0a7050] transition-colors"
          >
            Firmar y emitir →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[#f5f5f6] p-5 flex gap-5">
        {record && appt ? (
          <>
            <PrescriptionDoc
              record={record}
              patientName={patientName}
              patientId={patientId}
              professionalName={professionalName}
            />
            <SigningPanel
              record={record}
              professionalName={professionalName}
              onSign={() => setShowSignModal(true)}
              isSigning={isSigning}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-[#7d7d87]">Cargando...</p>
          </div>
        )}
      </div>

      <DigitalSignatureModal
        open={showSignModal}
        onClose={() => setShowSignModal(false)}
        onConfirm={handleConfirmSign}
        isSigning={isSigning}
      />
    </div>
  );
}
