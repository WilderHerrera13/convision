import React from 'react';
import { format } from 'date-fns';
import { Percent as PercentIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import NewSaleTopbar from '@/components/sales/NewSaleTopbar';
import ClientSearch from '@/components/sales/ClientSearch';
import RecommendedProducts from '@/components/sales/RecommendedProducts';
import ProductList from '@/components/sales/ProductList';
import PurchaseSummary from '@/components/sales/PurchaseSummary';
import PaymentForm from '@/components/sales/PaymentForm';
import { useNewSale } from '@/components/sales/useNewSale';

const NewSale: React.FC = () => {
  const sale = useNewSale();

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f6] overflow-hidden">
      <NewSaleTopbar
        onSubmit={sale.submitSale}
        isLoading={sale.isLoading}
        isDisabled={sale.saleItems.length === 0 || !sale.selectedPatient}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-6 p-6">
          <div className="flex-1 min-w-0 bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden self-start">
            <div className="bg-[#f7f4ff] border-b border-[#e5e5e9] h-[44px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Cliente *</span>
            </div>

            <ClientSearch
              selectedPatient={sale.selectedPatient}
              onSelectPatient={sale.setSelectedPatient}
              onClearPatient={() => sale.setSelectedPatient(null)}
            />

            <div className="bg-[#f7f7f8] border-b border-t border-[#e5e5e9] h-[40px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Información del Documento</span>
            </div>

            <div className="px-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-semibold text-[#121212] block mb-1">N° Documento</label>
                  <input
                    className="w-full h-[36px] bg-[#f5f5f6] border border-[#e5e5e9] rounded-[6px] px-3 text-[13px] text-[#7d7d87] cursor-not-allowed"
                    value={sale.documentNumber}
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#121212] block mb-1">Fecha *</label>
                  <DatePicker
                    value={sale.salesDate}
                    onChange={(d) => sale.setSalesDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    useInputTrigger
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#f7f7f8] border-b border-t border-[#e5e5e9] h-[40px] flex items-center px-4">
              <span className="text-[13px] font-semibold text-[#121212]">Productos</span>
            </div>

            <RecommendedProducts
              appointmentId={sale.appointmentId}
              patientId={sale.selectedPatient?.id}
              onAddProduct={sale.addProductDirect}
              addedProductIds={sale.saleItems.map((i) => i.lens.id)}
              selectedPatientName={
                sale.selectedPatient
                  ? `${sale.selectedPatient.first_name} ${sale.selectedPatient.last_name}`
                  : undefined
              }
            />

            <ProductList
              items={sale.saleItems}
              onRemove={sale.removeItem}
              onUpdateQuantity={sale.updateQuantity}
            />
          </div>

          <div className="w-[332px] shrink-0 flex flex-col gap-4">
            <PurchaseSummary
              items={sale.saleItems}
              subtotal={sale.subtotal}
              tax={sale.tax}
              total={sale.total}
              isLoading={sale.isSummaryLoading}
            />
            <PaymentForm
              paymentMethods={sale.paymentMethods}
              selectedPaymentMethodId={sale.selectedPaymentMethodId}
              paymentReference={sale.paymentReference}
              customerNote={sale.customerNote}
              isPartialPayment={sale.isPartialPayment}
              paymentAmount={sale.paymentAmount}
              onPaymentMethodChange={sale.setSelectedPaymentMethodId}
              onReferenceChange={sale.setPaymentReference}
              onNoteChange={sale.setCustomerNote}
              onPartialPaymentChange={sale.setIsPartialPayment}
              onPaymentAmountChange={sale.setPaymentAmount}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#e5e5e9] h-[64px] flex items-center px-6 shrink-0">
        <span className="text-[12px] text-[#b4b5bc]">Los campos marcados con * son obligatorios</span>
      </div>

      <DiscountRequestModal
        lens={sale.selectedLens}
        patient={sale.selectedPatient}
        isOpen={sale.isDiscountModalOpen}
        onClose={() => sale.setIsDiscountModalOpen(false)}
        onSuccess={sale.handleDiscountSuccess}
      />

      <Dialog open={sale.isDiscountSelectionOpen} onOpenChange={sale.setIsDiscountSelectionOpen}>
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
                {sale.availableDiscounts.map((d) => (
                  <tr key={d.id} className={sale.selectedDiscount?.id === d.id ? 'bg-[#f1edff]' : ''}>
                    <td className="px-2 py-2 text-sm">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                        {d.discount_percentage}%
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {d.is_global ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Global</Badge>
                      ) : 'Paciente'}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-gray-400">{formatCurrency(d.original_price)}</span>
                        <span className="font-medium text-green-600">{formatCurrency(d.discounted_price)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <Button variant="ghost" size="sm" onClick={() => sale.applyDiscount(d)} className="h-8">
                        {sale.selectedDiscount?.id === d.id ? 'Aplicado' : 'Aplicar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => sale.setIsDiscountSelectionOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sale.isDiscountInfoModalOpen} onOpenChange={sale.setIsDiscountInfoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <PercentIcon className="h-5 w-5" />
              Descuento Aplicado
            </DialogTitle>
            <DialogDescription>
              El siguiente descuento ha sido aplicado automáticamente a su compra.
            </DialogDescription>
          </DialogHeader>
          {sale.appliedDiscountInfo && (
            <div className="py-4 space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{sale.appliedDiscountInfo.percentage}%</div>
                <div className="text-sm text-green-700">de descuento</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Precio original:</div>
                  <div className="font-medium text-base line-through text-gray-400">
                    {formatCurrency(sale.appliedDiscountInfo.originalPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Descuento:</div>
                  <div className="font-medium text-base text-red-500">
                    -{formatCurrency(sale.appliedDiscountInfo.amount)}
                  </div>
                </div>
              </div>
              <div className="bg-[#f1edff] p-3 rounded-lg border border-[rgba(135,83,239,0.3)]">
                <div className="text-gray-500 text-sm">Precio final:</div>
                <div className="font-bold text-lg text-[#8753ef]">
                  {formatCurrency(sale.appliedDiscountInfo.finalPrice)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => sale.setIsDiscountInfoModalOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale;
