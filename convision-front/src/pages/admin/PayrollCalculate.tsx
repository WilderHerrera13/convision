import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calculator, Download } from "lucide-react";
import { toast } from "sonner";

export default function PayrollCalculate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<any>(null);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    employee_type: 'all',
    include_overtime: true,
    include_bonuses: true
  });

  const handleCalculate = async () => {
    setLoading(true);

    try {
      // TODO: Implement payroll calculation API call
      console.log('Calculating payroll:', formData);
      
      // Mock calculation result
      const mockResult = {
        total_employees: 25,
        total_basic_salary: 50000000,
        total_overtime: 2500000,
        total_bonuses: 1200000,
        total_deductions: 8500000,
        total_taxes: 12000000,
        net_payroll: 33200000,
        employees: [
          {
            id: 1,
            name: 'Juan Pérez',
            basic_salary: 2000000,
            overtime: 100000,
            bonuses: 50000,
            deductions: 340000,
            taxes: 480000,
            net_salary: 1330000
          },
          // Add more mock employees...
        ]
      };

      setCalculations(mockResult);
      toast.success("Cálculo de nómina completado");
    } catch (error) {
      console.error('Error calculating payroll:', error);
      toast.error("Error al calcular la nómina");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/admin/payrolls')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Calcular Nómina</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculation Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Parámetros de Cálculo</CardTitle>
            <CardDescription>
              Configure los parámetros para el cálculo de la nómina
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">Inicio del Período</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => handleInputChange('period_start', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_end">Fin del Período</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => handleInputChange('period_end', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_type">Tipo de Empleado</Label>
              <Select 
                value={formData.employee_type} 
                onValueChange={(value) => handleInputChange('employee_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  <SelectItem value="full-time">Tiempo completo</SelectItem>
                  <SelectItem value="part-time">Medio tiempo</SelectItem>
                  <SelectItem value="contract">Contratistas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include_overtime"
                checked={formData.include_overtime}
                onChange={(e) => handleInputChange('include_overtime', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="include_overtime">Incluir horas extra</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include_bonuses"
                checked={formData.include_bonuses}
                onChange={(e) => handleInputChange('include_bonuses', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="include_bonuses">Incluir bonificaciones</Label>
            </div>

            <Button onClick={handleCalculate} disabled={loading} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? 'Calculando...' : 'Calcular Nómina'}
            </Button>
          </CardContent>
        </Card>

        {/* Summary Results */}
        {calculations && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Cálculo</CardTitle>
              <CardDescription>
                Resumen de la nómina calculada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Empleados</p>
                    <p className="text-2xl font-bold">{calculations.total_employees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salario Básico</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculations.total_basic_salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horas Extra</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculations.total_overtime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bonificaciones</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculations.total_bonuses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deducciones</p>
                    <p className="text-2xl font-bold text-red-600">-{formatCurrency(calculations.total_deductions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impuestos</p>
                    <p className="text-2xl font-bold text-red-600">-{formatCurrency(calculations.total_taxes)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold">Nómina Neta Total:</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculations.net_payroll)}
                    </p>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reporte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Results Table */}
      {calculations && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Detalle por Empleado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Salario Básico</TableHead>
                  <TableHead>Horas Extra</TableHead>
                  <TableHead>Bonificaciones</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Impuestos</TableHead>
                  <TableHead>Salario Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.employees.map((employee: any) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{formatCurrency(employee.basic_salary)}</TableCell>
                    <TableCell>{formatCurrency(employee.overtime)}</TableCell>
                    <TableCell>{formatCurrency(employee.bonuses)}</TableCell>
                    <TableCell className="text-red-600">-{formatCurrency(employee.deductions)}</TableCell>
                    <TableCell className="text-red-600">-{formatCurrency(employee.taxes)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(employee.net_salary)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 