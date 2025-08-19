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

export default function NewCashTransfer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    from_account: '',
    to_account: '',
    amount: '',
    transfer_date: '',
    reference: '',
    description: '',
    transfer_type: 'internal'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement cash transfer creation API call
      console.log('Creating cash transfer:', formData);
      
      toast.success("Transferencia creada exitosamente");
      navigate('/admin/cash-transfers');
    } catch (error) {
      console.error('Error creating cash transfer:', error);
      toast.error("Error al crear la transferencia");
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
          onClick={() => navigate('/admin/cash-transfers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Transferencia</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Transferencia</CardTitle>
          <CardDescription>
            Complete los datos para crear una nueva transferencia de dinero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transfer_type">Tipo de Transferencia</Label>
                <Select 
                  value={formData.transfer_type} 
                  onValueChange={(value) => handleInputChange('transfer_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interna</SelectItem>
                    <SelectItem value="external">Externa</SelectItem>
                    <SelectItem value="wire">Transferencia bancaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_account">Cuenta Origen</Label>
                <Select 
                  value={formData.from_account} 
                  onValueChange={(value) => handleInputChange('from_account', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caja-principal">Caja Principal</SelectItem>
                    <SelectItem value="banco-colombia">Bancolombia - Cuenta Corriente</SelectItem>
                    <SelectItem value="banco-bogota">Banco de Bogotá - Ahorros</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="to_account">Cuenta Destino</Label>
                <Select 
                  value={formData.to_account} 
                  onValueChange={(value) => handleInputChange('to_account', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caja-principal">Caja Principal</SelectItem>
                    <SelectItem value="banco-colombia">Bancolombia - Cuenta Corriente</SelectItem>
                    <SelectItem value="banco-bogota">Banco de Bogotá - Ahorros</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="proveedor-externo">Proveedor Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer_date">Fecha de Transferencia</Label>
                <Input
                  id="transfer_date"
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => handleInputChange('transfer_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Número de referencia o transacción"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                placeholder="Descripción de la transferencia"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/cash-transfers')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Transferencia'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 