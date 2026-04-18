import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Bullet: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="flex gap-3">
    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#3a71f7]" aria-hidden />
    <div>
      <p className="text-[12px] font-semibold text-[#0f0f12]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[#7d7d87]">{body}</p>
    </div>
  </div>
);

const LaboratoryHelpAside: React.FC = () => (
  <div className="flex w-full flex-col gap-4 lg:w-[332px] lg:shrink-0">
    <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
      <CardHeader className="border-b border-[#e5e5e9] px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-[#0f0f12]">
          <span className="text-[10px] font-normal text-[#3a71f7]" aria-hidden>
            ◆
          </span>
          Sobre este laboratorio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <Bullet
          title="Nombre"
          body="Identificador único del laboratorio en el sistema."
        />
        <Bullet
          title="Estado activo"
          body="Solo los laboratorios activos aparecen en pedidos y ventas."
        />
        <Bullet
          title="Contacto"
          body="Persona responsable para coordinar fabricación."
        />
      </CardContent>
    </Card>
    <div className="rounded-lg border border-[#c5d3f8] bg-[#f0f1ff] p-3 text-[#3a71f7]">
      <p className="text-[10px] font-normal" aria-hidden>
        ◆
      </p>
      <p className="mt-1 text-[13px] font-semibold">Impacto en pedidos y ventas</p>
      <p className="mt-2 text-[12px] font-normal leading-snug">
        El estado activo/inactivo controla si este laboratorio aparece disponible al crear órdenes de laboratorio y
        ventas.
      </p>
    </div>
  </div>
);

export default LaboratoryHelpAside;
