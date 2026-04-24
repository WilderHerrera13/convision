import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';

interface AssignDrawerTabProps {
  order: LaboratoryOrder;
  allOrders: LaboratoryOrder[];
  selectedDrawer: string;
  onDrawerChange: (value: string) => void;
}

const TOTAL_DRAWERS = 12;

const AssignDrawerTab: React.FC<AssignDrawerTabProps> = ({
  order,
  allOrders,
  selectedDrawer,
  onDrawerChange,
}) => {
  const drawerMap: Record<string, string> = {};
  for (const o of allOrders) {
    if (
      o.drawer_number &&
      o.id !== order.id &&
      o.status !== 'delivered' &&
      o.status !== 'cancelled'
    ) {
      drawerMap[o.drawer_number] = o.order_number;
    }
  }

  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : '—';

  const approvedBy = order.createdBy?.name ?? '—';
  const isApproved =
    order.status === 'in_quality' || order.status === 'ready_for_delivery';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Resumen del lente
            </CardTitle>
            {isApproved && (
              <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full">
                Aprobado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5"># Orden</p>
            <p className="font-medium">{order.order_number}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Paciente</p>
            <p className="font-medium">{patientName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Laboratorio</p>
            <p className="font-medium">{order.laboratory?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Aprobado por</p>
            <p className="font-medium">{approvedBy}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Asignación de cajón físico
          </CardTitle>
          <p className="text-xs text-gray-500">Seleccione el cajón disponible *</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: TOTAL_DRAWERS }, (_, i) => i + 1).map((num) => {
              const numStr = String(num);
              const isSelected = selectedDrawer === numStr;
              const occupiedBy = drawerMap[numStr];

              let containerClass =
                'border rounded-lg p-3 flex flex-col items-center transition-colors select-none';
              if (isSelected) {
                containerClass += ' border-[#8753ef] bg-[#f1edff] cursor-pointer';
              } else if (occupiedBy) {
                containerClass += ' border-gray-200 bg-gray-50 cursor-not-allowed opacity-70';
              } else {
                containerClass +=
                  ' border-gray-200 hover:border-[#8753ef] hover:bg-[#faf8ff] cursor-pointer';
              }

              return (
                <div
                  key={num}
                  className={containerClass}
                  onClick={() => !occupiedBy && onDrawerChange(numStr)}
                >
                  <span
                    className={`text-xl font-bold leading-tight ${
                      isSelected
                        ? 'text-[#8753ef]'
                        : occupiedBy
                        ? 'text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    #{num}
                  </span>
                  {isSelected ? (
                    <span className="text-[10px] text-[#8753ef] font-medium mt-0.5">
                      Seleccionado
                    </span>
                  ) : occupiedBy ? (
                    <span className="text-[9px] text-gray-400 mt-0.5 truncate w-full text-center">
                      {occupiedBy}
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-600 font-medium mt-0.5">
                      Libre
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-5 text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-gray-300 bg-white" />
              <span>Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-[#8753ef] bg-[#f1edff]" />
              <span>Seleccionado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-gray-300 bg-gray-100" />
              <span>Ocupada por otra orden</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignDrawerTab;
