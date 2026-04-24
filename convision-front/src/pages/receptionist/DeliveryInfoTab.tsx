import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LaboratoryOrder } from '@/services/laboratoryOrderService';

export interface DeliveryFormState {
  recipient: string;
  documentType: string;
  documentNumber: string;
  deliveryTime: string;
  productCondition: string;
  check1: boolean;
  check2: boolean;
  check3: boolean;
}

interface DeliveryInfoTabProps {
  order: LaboratoryOrder;
  state: DeliveryFormState;
  onChange: (patch: Partial<DeliveryFormState>) => void;
  errors: Partial<Record<keyof DeliveryFormState, string>>;
}

const DeliveryInfoTab: React.FC<DeliveryInfoTabProps> = ({ order, state, onChange, errors }) => {
  const patientName = order.patient
    ? `${order.patient.first_name} ${order.patient.last_name}`
    : 'Titular';

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Datos de la entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Persona que retira <span className="text-red-500">*</span>
            </label>
            <Select
              value={state.recipient}
              onValueChange={(v) => onChange({ recipient: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="titular">Titular ({patientName})</SelectItem>
                <SelectItem value="other">Otra persona</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Si retira un tercero, selecciona &quot;Otra persona&quot; y registra los datos abajo.
            </p>
            {errors.recipient && <p className="text-xs text-red-500">{errors.recipient}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Tipo de documento <span className="text-red-500">*</span>
              </label>
              <Select
                value={state.documentType}
                onValueChange={(v) => onChange({ documentType: v })}
              >
                <SelectTrigger className="w-full max-w-[350px]">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                  <SelectItem value="CE">CE</SelectItem>
                  <SelectItem value="PPT">PPT</SelectItem>
                </SelectContent>
              </Select>
              {errors.documentType && (
                <p className="text-xs text-red-500">{errors.documentType}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Número de documento <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Número"
                className="max-w-[350px]"
                value={state.documentNumber}
                onChange={(e) => onChange({ documentNumber: e.target.value })}
              />
              {errors.documentNumber && (
                <p className="text-xs text-red-500">{errors.documentNumber}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Hora de entrega <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                className="max-w-[350px]"
                value={state.deliveryTime}
                onChange={(e) => onChange({ deliveryTime: e.target.value })}
              />
              <p className="text-xs text-[#7d7d87]">Formato: DD/MM/AAAA HH:MM</p>
              {errors.deliveryTime && (
                <p className="text-xs text-red-500">{errors.deliveryTime}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Estado del producto al entregar <span className="text-red-500">*</span>
              </label>
              <Select
                value={state.productCondition}
                onValueChange={(v) => onChange({ productCondition: v })}
              >
                <SelectTrigger className="w-full max-w-[350px]">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conforme">Conforme</SelectItem>
                  <SelectItem value="Con observaciones">Con observaciones</SelectItem>
                  <SelectItem value="Con daños">Con daños</SelectItem>
                </SelectContent>
              </Select>
              {errors.productCondition && (
                <p className="text-xs text-red-500">{errors.productCondition}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Confirmación y firma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="del_check1"
                checked={state.check1}
                onCheckedChange={(v) => onChange({ check1: Boolean(v) })}
                className="mt-0.5"
              />
              <label htmlFor="del_check1" className="text-sm cursor-pointer leading-snug">
                Verifiqué la identidad del cliente con documento físico.
              </label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="del_check2"
                checked={state.check2}
                onCheckedChange={(v) => onChange({ check2: Boolean(v) })}
                className="mt-0.5"
              />
              <label htmlFor="del_check2" className="text-sm cursor-pointer leading-snug">
                El cliente probó el lente y confirmó conformidad.
              </label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="del_check3"
                checked={state.check3}
                onCheckedChange={(v) => onChange({ check3: Boolean(v) })}
                className="mt-0.5"
              />
              <label htmlFor="del_check3" className="text-sm cursor-pointer leading-snug">
                Se entregó estuche, paño y certificado de garantía.
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Área de firma</p>
            <div className="bg-[#f9f9fb] border border-[#e0e0e4] rounded-[6px] h-[80px] flex items-center justify-between px-4">
              <span className="text-gray-400 text-sm">✍ Firmar en pantalla o capturar firma física</span>
              <button
                type="button"
                className="text-xs border border-gray-300 rounded px-3 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Capturar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryInfoTab;
