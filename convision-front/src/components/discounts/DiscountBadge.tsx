import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Percent, UserCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiscountData {
  id: number;
  discount_percentage: number;
  is_global: boolean;
  expiry_date?: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface DiscountBadgeProps {
  discount: DiscountData;
  showPatient?: boolean;
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({ discount, showPatient = true }) => {
  // Format expiry date if available
  const expiryInfo = discount.expiry_date 
    ? `Expira ${formatDistanceToNow(new Date(discount.expiry_date), { addSuffix: true, locale: es })}`
    : 'No expira';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-green-100 hover:bg-green-200 text-green-800 border-green-200 flex items-center py-1 cursor-default">
            <Percent className="h-3 w-3 mr-1" />
            <span>{discount.discount_percentage}% {discount.is_global ? '' : 'para este paciente'}</span>
            {!discount.is_global && showPatient && discount.patient && (
              <UserCheck className="h-3 w-3 ml-1" />
            )}
            {discount.is_global && (
              <Users className="h-3 w-3 ml-1" />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-sm">
            <div><strong>Descuento: {discount.discount_percentage}%</strong></div>
            {discount.is_global ? (
              <div>Aplicable a todos los pacientes</div>
            ) : discount.patient && showPatient ? (
              <div>Específico para: {discount.patient.first_name} {discount.patient.last_name}</div>
            ) : null}
            <div className="text-xs text-gray-500 mt-1">{expiryInfo}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DiscountBadge; 