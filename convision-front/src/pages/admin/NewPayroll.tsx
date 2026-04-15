import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { payrollService } from '@/services/payrollService';

export default function NewPayroll() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_identification: '',
    employee_position: '',
    pay_period_start: '',
    pay_period_end: '',
    base_salary: '',
    overtime_hours: '',
    overtime_rate: '',
    bonuses: '',
    other_deductions: '',
    tax_deduction: '',
    health_deduction: '',
    pension_deduction: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convertir valores numéricos
      const payrollData = {
        employee_name: formData.employee_name,
        employee_identification: formData.employee_identification,
        employee_position: formData.employee_position,
        pay_period_start: formData.pay_period_start,
        pay_period_end: formData.pay_period_end,
        base_salary: parseFloat(formData.base_salary) || 0,
        overtime_hours: parseFloat(formData.overtime_hours) || 0,
        overtime_rate: parseFloat(formData.overtime_rate) || 0,
        bonuses: parseFloat(formData.bonuses) || 0,
        other_deductions: parseFloat(formData.other_deductions) || 0,
        tax_deduction: parseFloat(formData.tax_deduction) || 0,
        health_deduction: parseFloat(formData.health_deduction) || 0,
        pension_deduction: parseFloat(formData.pension_deduction) || 0,
        notes: formData.notes
      };

      await payrollService.createPayroll(payrollData);
      
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
                <Label htmlFor="employee_identification">Identificación del Empleado</Label>
                <Input
                  id="employee_identification"
                  value={formData.employee_identification}
                  onChange={(e) => handleInputChange('employee_identification', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_position">Cargo/Posición</Label>
                <Input
                  id="employee_position"
                  value={formData.employee_position}
                  onChange={(e) => handleInputChange('employee_position', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_salary">Salario Base</Label>
                <Input
                  id="base_salary"
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => handleInputChange('base_salary', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay_period_start">Inicio del Período</Label>
                <DatePicker value={formData.pay_period_start} onChange={(d)=>handleInputChange('pay_period_start', d ? d.toISOString().slice(0,10) : '')} useInputTrigger />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay_period_end">Fin del Período</Label>
                <DatePicker value={formData.pay_period_end} onChange={(d)=>handleInputChange('pay_period_end', d ? d.toISOString().slice(0,10) : '')} useInputTrigger />
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
                <Label htmlFor="other_deductions">Otras Deducciones</Label>
                <Input
                  id="other_deductions"
                  type="number"
                  step="0.01"
                  value={formData.other_deductions}
                  onChange={(e) => handleInputChange('other_deductions', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_deduction">Deducción de Impuestos</Label>
                <Input
                  id="tax_deduction"
                  type="number"
                  step="0.01"
                  value={formData.tax_deduction}
                  onChange={(e) => handleInputChange('tax_deduction', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_deduction">Deducción de Salud</Label>
                <Input
                  id="health_deduction"
                  type="number"
                  step="0.01"
                  value={formData.health_deduction}
                  onChange={(e) => handleInputChange('health_deduction', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pension_deduction">Deducción de Pensión</Label>
                <Input
                  id="pension_deduction"
                  type="number"
                  step="0.01"
                  value={formData.pension_deduction}
                  onChange={(e) => handleInputChange('pension_deduction', e.target.value)}
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