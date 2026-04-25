import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';

interface RxRow {
  label: string;
  esfera: string;
  cilindro: string;
  eje: string;
  adicion: string;
  dp: string;
  af: string;
  diametro: string;
  curvaB: string;
  poder: string;
  prisma1: string;
  prisma2: string;
  prisma3: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Cell({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border border-[#dde2ea] text-center text-[7.5px] text-[#2d3748] px-1 py-1.5 ${className}`}>
      {children ?? '—'}
    </td>
  );
}

const EMPTY_RX: RxRow = {
  label: '', esfera: '—', cilindro: '—', eje: '—', adicion: '—', dp: '—', af: '—',
  diametro: '—', curvaB: '—', poder: '—', prisma1: '—', prisma2: '—', prisma3: '—',
};

const LaboratoryOrderPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<LaboratoryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError('ID inválido'); setLoading(false); return; }
    laboratoryOrderService
      .getLaboratoryOrder(Number(id))
      .then(setOrder)
      .catch(() => setError('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && !error && order) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, error, order]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Cargando orden...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error ?? 'Orden no encontrada'}
      </div>
    );
  }

  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`.toUpperCase()
    : '—';
  const identification = order.patient?.identification ?? '—';
  const vendedor = order.createdBy?.name ?? '—';
  const labName = order.laboratory?.name ?? '—';
  const labPhone = order.laboratory?.phone ?? '—';
  const labContact = order.laboratory?.contact_person ?? '—';

  const odLens = order.order?.items?.[0]?.lens;
  const oiLens = order.order?.items?.[1]?.lens ?? odLens;

  const odDesc = odLens
    ? [odLens.description, odLens.material?.name, odLens.treatment?.name].filter(Boolean).join(' / ')
    : '—';
  const oiDesc = oiLens
    ? [oiLens.description, oiLens.material?.name, oiLens.treatment?.name].filter(Boolean).join(' / ')
    : '—';

  const odRow: RxRow = { ...EMPTY_RX, label: 'OD' };
  const oiRow: RxRow = { ...EMPTY_RX, label: 'OI' };

  const orderNum = order.order_number;
  const pedidoNum = order.order?.order_number ?? order.order_id ?? '—';
  const fechaCreacion = formatDateTime(order.created_at);
  const fechaEntrega = order.estimated_completion_date ? formatDate(order.estimated_completion_date) : '—';

  const barcodeWidths = [4, 2, 3, 1, 5, 2, 4, 1, 2, 3, 4, 1, 2, 5, 3, 1, 4, 2, 3, 1, 5, 2, 1, 3, 4, 2, 3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 2];
  let barcodeX = 0;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
        }
        body { font-family: 'Inter', sans-serif; background: white; }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-[#1a4b8e] text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-lg hover:bg-[#163d75] transition-colors"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="bg-white border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      </div>

      <div
        className="bg-white mx-auto"
        style={{ width: 794, minHeight: 684, position: 'relative', fontFamily: 'Inter, sans-serif' }}
      >
        {/* TopAccent */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 794, height: 4, background: '#1a3366' }} />

        {/* HeaderBG */}
        <div style={{ position: 'absolute', top: 4, left: 0, width: 794, height: 100, background: 'white' }} />

        {/* Logo */}
        <div style={{ position: 'absolute', top: 14, left: 24, width: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 53, height: 53 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '5px solid #363f80', background: 'transparent',
              }} />
              <div style={{
                position: 'absolute', top: 7, left: 7, right: 7, bottom: 7, borderRadius: '50%',
                border: '4px solid #5a6abf', background: 'transparent',
              }} />
              <div style={{
                position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, borderRadius: '50%',
                border: '3px solid #363f80',
                background: 'radial-gradient(circle at 38% 38%, rgba(255,255,255,0.7) 0%, transparent 60%)',
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: 12.3, color: '#363f80', lineHeight: 1.2 }}>ÓPTICA</span>
              <span style={{ fontWeight: 700, fontSize: 12.3, color: '#363f80', lineHeight: 1.2 }}>CONVISIÓN</span>
            </div>
          </div>
        </div>

        {/* Center: ORDEN DE LABORATORIO + número */}
        <div style={{ position: 'absolute', top: 20, left: 210, width: 200, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 7, fontWeight: 600, color: '#8a94a6', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            ORDEN DE LABORATORIO
          </p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1a4b8e', lineHeight: 1.1, marginTop: 4 }}>
            N° {orderNum}
          </p>
        </div>

        {/* Pedido N° */}
        <div style={{ position: 'absolute', top: 82, left: 236, display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 7.5, color: '#8a94a6' }}>Pedido N°:</span>
          <span style={{ fontSize: 7.5, fontWeight: 600, color: '#2d3748' }}>{String(pedidoNum)}</span>
        </div>

        {/* Badge ORIGINAL */}
        <div style={{
          position: 'absolute', top: 14, left: 702, width: 62, height: 20,
          background: '#1a4b8e', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 6.5, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>ORIGINAL</span>
        </div>

        {/* ClinicCard */}
        <div style={{
          position: 'absolute', top: 12, left: 560, width: 206, height: 80,
          background: '#e8eff7', border: '1px solid #c5d6ed', borderRadius: 6,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 80, background: '#1a4b8e', borderRadius: '3px 0 0 3px' }} />
          <div style={{ paddingLeft: 14, paddingTop: 6, paddingRight: 8 }}>
            {[
              { label: 'Óptica', value: 'YAZMIN ALICIA AGUILAR LÓPEZ' },
              { label: 'NIT', value: '40325867' },
              { label: 'Tel', value: '317 242 7855  ·  318 355 5812' },
              { label: 'Email', value: 'opticaconvision@gmail.com' },
              { label: 'Dir', value: 'CL 15 # 16-23, Barrio Centro' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 4, marginBottom: 1 }}>
                <span style={{ fontSize: 6.5, fontWeight: 600, color: '#1a4b8e', minWidth: 28 }}>{label}</span>
                <span style={{ fontSize: 6.5, color: '#2d3748' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Separator line */}
        <div style={{ position: 'absolute', top: 104, left: 28, width: 738, height: 1, background: '#dde2ea' }} />

        {/* InfoCard */}
        <div style={{
          position: 'absolute', top: 112, left: 28, width: 738, height: 62,
          background: '#f8f9fb', border: '1px solid #dde2ea', borderRadius: 6,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 62, background: '#1a4b8e', borderRadius: '3px 0 0 3px' }} />
          <div style={{ position: 'absolute', top: 0, left: 371, width: 3, height: 62, background: '#1a4b8e' }} />
          <div style={{ position: 'absolute', top: 0, left: 369, width: 1, height: 62, background: '#dde2ea' }} />

          {/* Left: patient info */}
          <div style={{ position: 'absolute', top: 8, left: 16 }}>
            {[
              { label: 'Paciente:', value: patientName },
              { label: 'Documento:', value: identification },
              { label: 'Vendedor:', value: vendedor },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 7, fontWeight: 600, color: '#8a94a6', minWidth: 60 }}>{label}</span>
                <span style={{ fontSize: 7.5, fontWeight: 600, color: '#111824' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right: provider info */}
          <div style={{ position: 'absolute', top: 8, left: 390 }}>
            {[
              { label: 'Proveedor:', value: labName },
              { label: 'Tel. Prov.:', value: labPhone },
              { label: 'Fecha crea.:', value: `${fechaCreacion}     Entrega: ${fechaEntrega}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 7, fontWeight: 600, color: '#8a94a6', minWidth: 60 }}>{label}</span>
                <span style={{ fontSize: 7.5, fontWeight: 600, color: '#111824' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RX Section Header */}
        <div style={{
          position: 'absolute', top: 186, left: 28, width: 738, height: 24,
          background: '#3a71f7', borderRadius: 6,
          display: 'flex', alignItems: 'center', paddingLeft: 12,
        }}>
          <span style={{ fontSize: 8, fontWeight: 600, color: 'white', letterSpacing: '0.032em', textTransform: 'uppercase' }}>
            Prescripción Óptica — Fórmula RX y Prisma
          </span>
        </div>

        {/* RX Table */}
        <div style={{ position: 'absolute', top: 210, left: 28, width: 738 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '7px' }}>
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 48 }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 54 }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 62 }} />
              <col style={{ width: 62 }} />
              <col style={{ width: 108 }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#eff2f7', height: 24 }}>
                <td style={{ background: '#e8f0f7', borderBottom: '1px solid #dde2ea' }} />
                {['Esfera', 'Cilindro', 'Eje', 'Adición', 'DP', 'AF', 'Ø', 'Curva B', 'Poder'].map((h) => (
                  <td key={h} style={{
                    textAlign: 'center', fontSize: 6.5, fontWeight: 600,
                    color: '#1a4b8e', borderBottom: '1px solid #dde2ea', borderLeft: '1px solid #dde2ea',
                    verticalAlign: 'middle',
                  }}>{h}</td>
                ))}
                <td colSpan={3} style={{
                  textAlign: 'center', fontSize: 7, fontWeight: 600, color: 'white',
                  background: 'rgba(58,113,247,0.9)', verticalAlign: 'middle',
                }}>PRISMA</td>
              </tr>
            </thead>
            <tbody>
              {[odRow, oiRow].map((row) => (
                <tr key={row.label} style={{ height: 28, background: row.label === 'OD' ? 'white' : '#f8f9fb' }}>
                  <td style={{
                    background: '#e8eff7', textAlign: 'center', fontSize: 8.5, fontWeight: 700,
                    color: '#1a4b8e', borderTop: '1px solid #dde2ea',
                  }}>{row.label}</td>
                  {[row.esfera, row.cilindro, row.eje, row.adicion, row.dp, row.af,
                    row.diametro, row.curvaB, row.poder, row.prisma1, row.prisma2, row.prisma3].map((val, i) => (
                    <Cell key={i}>{val}</Cell>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lentes Section Header */}
        <div style={{
          position: 'absolute', top: 308, left: 28, width: 738, height: 24,
          background: '#3a71f7', borderRadius: 6, display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 8, fontWeight: 600, color: 'white', letterSpacing: '0.032em', paddingLeft: 12 }}>
            LENTES PRESCRITOS
          </span>
          <div style={{ position: 'absolute', top: 0, left: 488, width: 1, height: 24, background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: 8, fontWeight: 600, color: 'white', letterSpacing: '0.032em', paddingLeft: 504 }}>
            ESPECIFICACIONES DE MONTURA
          </span>
        </div>

        {/* Lentes Left Table */}
        <div style={{
          position: 'absolute', top: 332, left: 28, width: 488, height: 92,
          background: 'white', border: '1px solid #dde2ea',
        }}>
          <div style={{ background: '#f8f9fb', height: 45, borderBottom: '1px solid #dde2ea' }}>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: '#1a4b8e', minWidth: 24 }}>OD</span>
              <span style={{ fontSize: 8, color: '#111824' }}>{odDesc}</span>
            </div>
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: '#1a4b8e', minWidth: 24 }}>OI</span>
            <span style={{ fontSize: 8, color: '#111824' }}>{oiDesc}</span>
          </div>
        </div>

        {/* Montura Right Panel */}
        <div style={{
          position: 'absolute', top: 332, left: 516, width: 250, height: 92,
          background: 'white', border: '1px solid #dde2ea',
        }}>
          <div style={{
            background: '#e8eff7', height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: '1px solid #dde2ea',
          }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: '#1a4b8e' }}>MONTURA</span>
          </div>
          <div style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
            {[
              ['Color:', '—'], ['Horizontal:', '—'],
              ['Puente:', '—'], ['Vertical:', '—'],
              ['Áng. pant:', '—'], ['Dist Mec:', '—'],
              ['Áng. panor:', '—'], ['Ø Efectivo:', '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 4 }}>
                <span style={{ fontSize: 6.5, fontWeight: 600, color: '#8a94a6' }}>{label}</span>
                <span style={{ fontSize: 6.5, fontWeight: 700, color: '#111824' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Observaciones Section Header */}
        <div style={{
          position: 'absolute', top: 432, left: 28, width: 738, height: 24,
          background: '#3a71f7', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 12,
        }}>
          <span style={{ fontSize: 8, fontWeight: 600, color: 'white', letterSpacing: '0.032em', textTransform: 'uppercase' }}>
            Observaciones e Instrucciones Especiales
          </span>
        </div>

        {/* Observaciones body */}
        <div style={{
          position: 'absolute', top: 456, left: 28, width: 738, height: 60,
          background: 'white', border: '1px solid #dde2ea',
          padding: '10px 12px',
        }}>
          <p style={{ margin: 0, fontSize: 7.5, color: order.notes ? '#111824' : '#94a2b6' }}>
            {order.notes ?? 'Sin observaciones adicionales.'}
          </p>
        </div>

        {/* Separator */}
        <div style={{ position: 'absolute', top: 532, left: 28, width: 738, height: 1, background: '#dde2ea' }} />

        {/* Autorizaciones label */}
        <p style={{
          position: 'absolute', top: 538, left: 28, margin: 0,
          fontSize: 6.5, fontWeight: 600, color: '#8a94a6', letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          AUTORIZACIONES Y CONFORMIDAD
        </p>

        {/* Signature lines */}
        {[
          { x: 28, label: 'Firma Responsable Óptica' },
          { x: 282, label: 'Firma Laboratorio' },
          { x: 536, label: 'Firma Cliente / Acudiente' },
        ].map(({ x, label }) => (
          <div key={label} style={{ position: 'absolute', top: 554, left: x, width: 210 }}>
            <div style={{ height: 1, background: '#dde2ea' }} />
            <p style={{ margin: '4px 0 0', fontSize: 7, color: '#8a94a6', textAlign: 'center' }}>{label}</p>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          position: 'absolute', top: 604, left: 0, width: 794, height: 80,
          background: '#0f0f12',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 794, height: 4, background: '#3a71f7' }} />

          {/* QR placeholder */}
          <div style={{
            position: 'absolute', top: 14, left: 20, width: 48, height: 48,
            background: 'white', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(45deg, #0f0f12 25%, transparent 25%) -5px 0, ' +
                'linear-gradient(45deg, transparent 75%, #0f0f12 75%) -5px 0, ' +
                'linear-gradient(-45deg, #0f0f12 25%, transparent 25%) 0 5px, ' +
                'linear-gradient(-45deg, transparent 75%, #0f0f12 75%) 0 5px',
              backgroundSize: '10px 10px',
              backgroundColor: 'white',
              borderRadius: 2,
            }} />
          </div>
          <p style={{
            position: 'absolute', top: 64, left: 44, transform: 'translateX(-50%)',
            margin: 0, fontSize: 6.5, color: '#80808f', textAlign: 'center',
          }}>
            Verificar
          </p>

          {/* Convision logo text */}
          <div style={{ position: 'absolute', top: 14, left: 76 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'white' }}>CONVISION</p>
            <p style={{ margin: '2px 0 0', fontSize: 7.5, color: '#80808f' }}>Software de Gestión Óptica</p>
          </div>

          {/* Barcode */}
          <div style={{
            position: 'absolute', top: 9, left: 277, width: 240, height: 62,
            background: 'white', borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', gap: 2, height: 40, alignItems: 'stretch' }}>
              {barcodeWidths.map((w, i) => {
                const x = barcodeX;
                barcodeX += w + 2;
                return (
                  <div key={i} style={{ width: w, background: '#0f0f12', flexShrink: 0 }} />
                );
              })}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 8, color: '#0f0f12', textAlign: 'center' }}>
              {orderNum}
            </p>
          </div>

          {/* Disclaimer */}
          <div style={{
            position: 'absolute', top: 18, right: 20, width: 220, textAlign: 'right',
          }}>
            <p style={{ margin: 0, fontSize: 7, color: '#80808f' }}>
              Documento generado digitalmente - No requiere firma
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 7, color: '#80808f' }}>
              manual cuando lleva sello digital
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LaboratoryOrderPrint;
