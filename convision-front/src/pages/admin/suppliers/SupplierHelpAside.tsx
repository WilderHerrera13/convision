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

type Tab = 'info' | 'contact';

const SupplierHelpAside: React.FC<{ tab: Tab }> = ({ tab }) => {
  if (tab === 'contact') {
    return (
      <div className="flex w-full flex-col gap-4 lg:w-[332px] lg:shrink-0">
        <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
          <CardHeader className="border-b border-[#e5e5e9] px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-[#0f0f12]">
              <span className="text-[10px] font-normal text-[#3a71f7]" aria-hidden>
                ◆
              </span>
              Datos de contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            <Bullet
              title="Nombre del contacto *"
              body="Persona responsable de la cuenta comercial."
            />
            <Bullet
              title="Teléfono principal *"
              body="Número directo para comunicaciones urgentes."
            />
            <Bullet
              title="Correo electrónico *"
              body="Se usará para envío de órdenes de compra."
            />
            <Bullet title="Dirección *" body="Sede principal o punto de despacho." />
          </CardContent>
        </Card>
        <div className="rounded-lg border border-[#c5d3f8] bg-[#f0f1ff] p-3 text-[#3a71f7]">
          <p className="text-[10px] font-normal" aria-hidden>
            ◆
          </p>
          <p className="mt-1 text-[13px] font-semibold">Contacto actualizado</p>
          <p className="mt-2 text-[12px] font-normal leading-snug">
            Mantener el contacto actualizado garantiza comunicación ágil con el proveedor para órdenes y negociaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[332px] lg:shrink-0">
      <Card className="overflow-hidden rounded-lg border border-[#ebebee] shadow-sm">
        <CardHeader className="border-b border-[#e5e5e9] px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-[#0f0f12]">
            <span className="text-[10px] font-normal text-[#3a71f7]" aria-hidden>
              ◆
            </span>
            Información importante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-4">
          <Bullet title="Nombre *" body="Nombre legal o comercial del proveedor." />
          <Bullet title="NIT / R.U.T. *" body="Identificación tributaria del proveedor." />
          <Bullet title="Ciudad *" body="Ciudad principal de operación." />
          <Bullet title="Forma de pago" body="Define los términos comerciales pactados." />
        </CardContent>
      </Card>
      <div className="rounded-lg border border-[#c5d3f8] bg-[#f0f1ff] p-3 text-[#3a71f7]">
        <p className="text-[10px] font-normal" aria-hidden>
          ◆
        </p>
        <p className="mt-1 text-[13px] font-semibold">Consejo de registro</p>
        <p className="mt-2 text-[12px] font-normal leading-snug">
          Registra correctamente el NIT y los términos de pago. Esto facilitará la gestión de compras y conciliaciones
          contables.
        </p>
      </div>
    </div>
  );
};

export default SupplierHelpAside;
