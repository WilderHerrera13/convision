import React from 'react';
import { Card } from '@/components/ui/card';

const BULLETS = [
  {
    title: 'Laboratorio',
    desc: 'Taller que fabricará el producto óptico solicitado.',
  },
  {
    title: 'Prioridad',
    desc: 'Urgente o Alta adelantan la orden en la cola del laboratorio.',
  },
  {
    title: 'Fecha estimada',
    desc: 'Plazo máximo acordado para recibir el producto listo.',
  },
  {
    title: 'Código del producto',
    desc: 'Referencia interna del artículo a fabricar.',
  },
  {
    title: 'Documento y celular',
    desc: 'Para notificar al cliente cuando el lente esté listo.',
  },
];

const NewLabOrderSidebar: React.FC = () => (
  <div className="flex flex-col gap-4">
    <Card>
      <div className="border-b border-border px-5 py-4 flex items-center gap-2">
        <span className="size-2.5 rotate-45 bg-[#8753ef] shrink-0" />
        <h3 className="text-[14px] font-semibold text-[#0f0f12]">Sobre esta orden</h3>
      </div>
      <div className="p-5 space-y-4">
        {BULLETS.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="mt-[5px] size-2 rounded-full bg-[#8753ef] shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-[#0f0f12] leading-none mb-1">{item.title}</p>
              <p className="text-[12px] text-[#7d7d87] leading-snug">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>

    <div className="rounded-lg border border-[#8753ef] bg-[#f1edff] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="size-2.5 rotate-45 bg-[#8753ef] shrink-0" />
        <p className="text-[13px] font-semibold text-[#8753ef]">Flujo de estados</p>
      </div>
      <p className="text-[13px] text-[#5b21b6] leading-snug">
        Al crear la orden, esta queda en estado &apos;Pendiente&apos; hasta que se envíe al
        laboratorio. Todo cambio se registra en el historial.
      </p>
    </div>
  </div>
);

export default NewLabOrderSidebar;
