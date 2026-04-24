import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Percent as PercentIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import NewSaleTopbar from '@/components/sales/NewSaleTopbar';
import ClientSearch from '@/components/sales/ClientSearch';
import RecommendedProducts from '@/components/sales/RecommendedProducts';
import ProductList from '@/components/sales/ProductList';
import PurchaseSummary from '@/components/sales/PurchaseSummary';
import PaymentForm from '@/components/sales/PaymentForm';
import { useNewSale } from '@/components/sales/useNewSale';

const NewSale: React.FC = () => {
  const navigate = useNavigate();
  const {
    saleItems, subtotal, tax, total, documentNumber, customerNote, setCustomerNote,
    isLoading, selectedPatient, setSelectedPatient,
    paymentReference, setPaymentReference,
    salesDate, setSalesDate, isDiscountModalOpen, setIsDiscountModalOpen,
    selectedLens, paymentMethods, selectedPaymentMethodId, setSelectedPaymentMethodId,
    isPartialPayment, setIsPartialPayment, paymentAmount, setPaymentAmount,
    availableDiscounts, selectedDiscount, isDiscountSelectionOpen, setIsDiscountSelectionOpen,
    isSummaryLoading, isDiscountInfoModalOpen, setIsDiscountInfoModalOpen, appliedDiscountInfo,
    applyDiscount, handleDiscountSuccess, addProductDirect, removeItem, updateQuantity, submitSale,
    appointmentId,
  } = useNewSale();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <NewSaleTopbar
        onSubmit={submitSale}
        isLoading={isLoading}
        isDisabled={saleItems.length === 0 || !selectedPatient}
      />

      <div className="flex-1 overflow-y-auto bg-[#f5f5f6] p-6">
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
            <div className="bg-[#f7f4ff] border-b border-[#e5e5e9] h-[44px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Cliente *</span>
            </div>

            <ClientSearch
              selectedPatient={selectedPatient}
              onSelectPatient={setSelectedPatient}
              onClearPatient={() => setSelectedPatient(null)}
            />

            <div className="bg-[#f7f7f8] border-t border-b border-[#e5e5e9] h-[40px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Información del Documento</span>
            </div>

            <div className="px-4 pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#121212]">N° Documento</label>
                  <Input
                    value={documentNumber}
                    readOnly
                    className="h-[36px] border-[#e5e5e9] bg-[#f5f5f6] text-[13px] text-[#7d7d87]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-[#121212]">Fecha *</label>
                  <DatePicker
                    value={salesDate}
                    onChange={(d) => setSalesDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    useInputTrigger
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#f7f7f8] border-t border-b border-[#e5e5e9] h-[40px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Productos</span>
            </div>

            <RecommendedProducts
              appointmentId={appointmentId}
              patientId={selectedPatient?.id}
              onAddProduct={addProductDirect}
              addedProductIds={saleItems.map((i) => i.lens.id).filter(Boolean)}
              onViewPrescription={
                appointmentId
                  ? () => navigate(`/receptionist/appointments/${appointmentId}`)
                  : undefined
              }
              selectedPatientName={
                selectedPatient
                  ? `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim()
                  : undefined
              }
            />

            <ProductList items={saleItems} onRemove={removeItem} onUpdateQuantity={updateQuantity} />
          </div>

          <div className="w-[332px] shrink-0 space-y-4">
            <PurchaseSummary
              items={saleItems}
              subtotal={subtotal}
              tax={tax}
              total={total}
              isLoading={isSummaryLoading}
            />
            <PaymentForm
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethodId}
              paymentReference={paymentReference}
              customerNote={customerNote}
              isPartialPayment={isPartialPayment}
              paymentAmount={paymentAmount}
              onPaymentMethodChange={setSelectedPaymentMethodId}
              onReferenceChange={setPaymentReference}
              onNoteChange={setCustomerNote}
              onPartialPaymentChange={setIsPartialPayment}
              onPaymentAmountChange={setPaymentAmount}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e5e5e9] h-[64px] flex items-center px-6 shrink-0">
        <span className="text-[12px] text-[#b4b5bc]">Los campos marcados con * son obligatorios</span>
      </div>

      <DiscountRequestModal
        lens={selectedLens}
        patient={selectedPatient}
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onSuccess={handleDiscountSuccess}
      />

      <Dialog open={isDiscountSelectionOpen} onOpenChange={setIsDiscountSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Descuentos Disponibles</DialogTitle>
            <DialogDescription>
              El mejor descuento ha sido aplicado automáticamente. Puede seleccionar otro si lo desea.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aplicable a</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {availableDiscounts.map((disc) => (
                  <tr key={disc.id} className={selectedDiscount?.id === disc.id ? 'bg-blue-50' : ''}>
                    <td className="px-2 py-2 text-sm">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                        {disc.discount_percentage}%
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {disc.is_global ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Global</Badge>
                      ) : disc.patient ? (
                        `${disc.patient.first_name} ${disc.patient.last_name}`
                      ) : 'Desconocido'}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-gray-400">${parseFloat(String(disc.original_price)).toFixed(2)}</span>
                        <span className="font-medium text-green-600">${parseFloat(String(disc.discounted_price)).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <Button variant="ghost" size="sm" onClick={() => applyDiscount(disc)} className="h-8">
                        {selectedDiscount?.id === disc.id ? 'Aplicado' : 'Aplicar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDiscountSelectionOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscountInfoModalOpen} onOpenChange={setIsDiscountInfoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <PercentIcon className="h-5 w-5" />
              Descuento Aplicado
            </DialogTitle>
            <DialogDescription>El siguiente descuento ha sido aplicado automáticamente a su compra.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {appliedDiscountInfo && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{appliedDiscountInfo.percentage}%</div>
                  <div className="text-sm text-green-700">de descuento</div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-gray-500">Precio original:</div>
                    <div className="font-medium text-base line-through text-gray-400">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(appliedDiscountInfo.originalPrice)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-gray-500">Descuento:</div>
                    <div className="font-medium text-base text-red-500">
                      -{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(appliedDiscountInfo.amount)}
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-gray-500 text-sm">Precio final:</div>
                  <div className="font-bold text-lg text-blue-700">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(appliedDiscountInfo.finalPrice)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDiscountInfoModalOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale;
