import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewPayroll() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: '',
    period_start: '',
    period_end: '',
    basic_salary: '',
    overtime_hours: '',
    overtime_rate: '',
    bonuses: '',
    deductions: '',
    tax_withholding: '',
    social_security: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement payroll creation API call
      console.log('Creating payroll:', formData);
      
      toast.success("Nómina creada exitosamente");
      navigate('/admin/payrolls');
    } catch (error) {
      console.error('Error creating payroll:', error);
      toast.error("Error al crear la nómina");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        <h1 className="text-3xl font-bold">Nueva Nómina</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Nómina</CardTitle>
          <CardDescription>
            Complete los datos para crear una nueva nómina
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_name">Nombre del Empleado</Label>
                <Input
                  id="employee_name"
                  value={formData.employee_name}
                  onChange={(e) => handleInputChange('employee_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="basic_salary">Salario Básico</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  step="0.01"
                  value={formData.basic_salary}
                  onChange={(e) => handleInputChange('basic_salary', e.target.value)}
                  required
                />
              </div>

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
                <Label htmlFor="overtime_hours">Horas Extra</Label>
                <Input
                  id="overtime_hours"
                  type="number"
                  step="0.5"
                  value={formData.overtime_hours}
                  onChange={(e) => handleInputChange('overtime_hours', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtime_rate">Tarifa Hora Extra</Label>
                <Input
                  id="overtime_rate"
                  type="number"
                  step="0.01"
                  value={formData.overtime_rate}
                  onChange={(e) => handleInputChange('overtime_rate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonuses">Bonificaciones</Label>
                <Input
                  id="bonuses"
                  type="number"
                  step="0.01"
                  value={formData.bonuses}
                  onChange={(e) => handleInputChange('bonuses', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductions">Deducciones</Label>
                <Input
                  id="deductions"
                  type="number"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => handleInputChange('deductions', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_withholding">Retención de Impuestos</Label>
                <Input
                  id="tax_withholding"
                  type="number"
                  step="0.01"
                  value={formData.tax_withholding}
                  onChange={(e) => handleInputChange('tax_withholding', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="social_security">Seguridad Social</Label>
                <Input
                  id="social_security"
                  type="number"
                  step="0.01"
                  value={formData.social_security}
                  onChange={(e) => handleInputChange('social_security', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/payrolls')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Nómina'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 