import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  submitted: { label: 'Enviado', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  approved: { label: 'Aprobado', className: 'bg-green-50 text-green-700 border-green-300' },
};

interface Props {
  totalRegistered: number;
  totalCounted: number;
  totalDifference: number;
  status: string;
}

const CashCloseSummary: React.FC<Props> = ({
  totalRegistered,
  totalCounted,
  totalDifference,
  status,
}) => {
  const isNegative = totalDifference < 0;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Estado del cierre:</span>
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Registrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{formatCOP(totalRegistered)}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{formatCOP(totalCounted)}</p>
          </CardContent>
        </Card>

        <Card className={isNegative ? 'border-red-200' : 'border-green-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-700'}`}>
              {isNegative
                ? `-${formatCOP(Math.abs(totalDifference))}`
                : formatCOP(totalDifference)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashCloseSummary;
