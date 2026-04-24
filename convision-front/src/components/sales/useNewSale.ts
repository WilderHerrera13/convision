import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { patientService } from '@/services/patientService';
import { saleService, PaymentMethod } from '@/services/saleService';
import { translatePaymentMethods } from '@/lib/translations';
import { discountService, Discount } from '@/services/discountService';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';
import type { Lens } from '@/services/lensService';

export interface SaleItem {
  id: string;
  lens: { id: number; name: string; price: string };
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  has_discounts?: boolean;
  meta?: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone: string;
}

interface SessionLens {
  id: number;
  description: string;
  internal_code: string;
  identifier: string;
  price: string | number;
  has_discounts?: boolean;
}

interface PatientApiResponse {
  data: Patient;
}

interface SaleApiResponse {
  id: number;
  sale_number: string;
  patient_id: number;
  laboratoryOrders?: unknown[];
  pdf_url?: string;
  guest_pdf_url?: string;
}

export interface DiscountData {
  id: number;
  lens_id: number;
  patient_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  discount_percentage: number;
  original_price: number;
  discounted_price: number;
  is_global: boolean;
  created_at: string;
  updated_at: string;
  reason?: string;
  rejection_reason?: string;
  approved_by?: number;
  expiry_date?: string;
}

function generateDocumentNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VNT-${y}-${m}${day}${rand}`;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function useNewSale() {
  const navigate = useNavigate();
  const location = useLocation();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [documentNumber] = useState(generateDocumentNumber);
  const [customerNote, setCustomerNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [productType, setProductType] = useState('glasses');
  const [productDescription, setProductDescription] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [salesDate, setSalesDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<{
    id: number; internal_code: string; identifier: string;
    description: string; price: number; has_discounts?: boolean;
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number>(1);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [isDiscountSelectionOpen, setIsDiscountSelectionOpen] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isDiscountInfoModalOpen, setIsDiscountInfoModalOpen] = useState(false);
  const [appliedDiscountInfo, setAppliedDiscountInfo] = useState<{
    percentage: number; amount: number; originalPrice: number; finalPrice: number;
  } | null>(null);

  const appointmentId: number | undefined = (() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('appointment_id');
    if (v) return parseInt(v, 10) || undefined;
    const state = location.state as { appointmentId?: number } | null;
    return state?.appointmentId ?? undefined;
  })();

  const recalcTotals = (items: SaleItem[]) => {
    const totalDisc = items.reduce((acc, i) => acc + i.discount, 0);
    const raw = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const net = raw - totalDisc;
    setSubtotal(net);
    setTax(net * 0.19);
    setTotal(net + net * 0.19);
  };

  useEffect(() => { recalcTotals(saleItems); }, [saleItems]);

  const fetchPatientData = async (patientId: number) => {
    try {
      if (!localStorage.getItem('access_token')) return;
      const response = await patientService.getPatient(patientId);
      let patient: Patient;
      if (response && typeof response === 'object' && 'data' in response) {
        patient = (response as PatientApiResponse).data;
      } else {
        patient = response as Patient;
      }
      if (patient?.id) setSelectedPatient(patient);
    } catch { /* silent */ }
  };

  const applyBestDiscountAutomatically = async (item: SaleItem) => {
    try {
      if (!selectedPatient) { setIsSummaryLoading(false); return; }
      const bestDiscount = await discountService.getBestDiscount(item.lens.id, selectedPatient.id);
      if (!bestDiscount) { setIsSummaryLoading(false); return; }
      setSelectedDiscount(bestDiscount);
      const allDiscounts = await discountService.getActiveDiscounts(item.lens.id, selectedPatient.id);
      setAvailableDiscounts(allDiscounts);
      setSaleItems((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((i) => i.id === item.id);
        if (idx < 0) return prev;
        const target = { ...updated[idx] };
        const gross = target.price * target.quantity;
        const pct = typeof bestDiscount.discount_percentage === 'string'
          ? parseFloat(bestDiscount.discount_percentage) : bestDiscount.discount_percentage;
        const amt = (gross * pct) / 100;
        target.discount = amt;
        target.total = gross - amt;
        updated[idx] = target;
        setAppliedDiscountInfo({ percentage: pct, amount: amt, originalPrice: gross, finalPrice: gross - amt });
        setIsDiscountInfoModalOpen(true);
        return updated;
      });
    } catch (e) {
      console.error('Error applying automatic discount:', e);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('pendingSale');
    if (!stored) return;
    try {
      setIsSummaryLoading(true);
      const parsed = JSON.parse(stored);
      const mkPatient = (id: number, name: string): Patient => ({
        id: Number(id),
        first_name: name.split(' ')[0] || '',
        last_name: name.split(' ').slice(1).join(' ') || '',
        identification: '', email: '', phone: '',
      });

      if (parsed.selectedLenses?.length > 0) {
        const newItems: SaleItem[] = parsed.selectedLenses.map((lens: SessionLens) => {
          const base = parseFloat(lens.price.toString()) || 0;
          const adj = sessionPriceAdjustmentService.getAdjustment(lens.id);
          const fp = adj ? adj.adjustedPrice : base;
          return { id: generateId(), lens: { id: lens.id, name: lens.description, price: fp.toString() }, description: lens.description, quantity: 1, price: fp, discount: 0, total: fp, has_discounts: lens.has_discounts };
        });
        setSaleItems(newItems);
        if (parsed.patientId) {
          const p = mkPatient(parsed.patientId, parsed.patientName || '');
          setSelectedPatient(p);
          fetchPatientData(p.id);
          setTimeout(() => { newItems.forEach((it) => { if (it.has_discounts) applyBestDiscountAutomatically(it); }); if (!newItems.some((i) => i.has_discounts)) setTimeout(() => setIsSummaryLoading(false), 500); }, 1000);
        } else { setTimeout(() => setIsSummaryLoading(false), 500); }
      } else if (parsed.selectedLens) {
        const lens = parsed.selectedLens;
        const base = parseFloat(lens.price) || 0;
        const adj = sessionPriceAdjustmentService.getAdjustment(lens.id);
        const fp = adj ? adj.adjustedPrice : base;
        const newItem: SaleItem = { id: generateId(), lens: { id: lens.id, name: lens.description, price: fp.toString() }, description: lens.description, quantity: 1, price: fp, discount: 0, total: fp, has_discounts: lens.has_discounts };
        setSaleItems([newItem]);
        setSelectedLens({ id: lens.id, internal_code: lens.internal_code, identifier: lens.identifier, description: lens.description, price: fp, has_discounts: lens.has_discounts });
        if (parsed.patientId) {
          const p = mkPatient(parsed.patientId, parsed.patientName || '');
          setSelectedPatient(p);
          fetchPatientData(p.id);
          if (lens.has_discounts) setTimeout(() => applyBestDiscountAutomatically(newItem), 1000);
          else setTimeout(() => setIsSummaryLoading(false), 500);
        } else { setTimeout(() => setIsSummaryLoading(false), 500); }
      } else if (parsed.patientId && parsed.patientName) {
        const p = mkPatient(parsed.patientId, parsed.patientName);
        setSelectedPatient(p);
        fetchPatientData(p.id);
        setTimeout(() => setIsSummaryLoading(false), 500);
      } else { setTimeout(() => setIsSummaryLoading(false), 500); }
      setSalesDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (e) {
      console.error('Error parsing stored sale data:', e);
      setIsSummaryLoading(false);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la información de la venta pendiente.' });
    }
  }, []);

  useEffect(() => {
    const fallback: PaymentMethod[] = [
      { id: 1, name: 'Efectivo', code: 'cash', requires_reference: false },
      { id: 2, name: 'Tarjeta de Crédito', code: 'credit_card', requires_reference: true },
      { id: 3, name: 'Transferencia Bancaria', code: 'transfer', requires_reference: true },
      { id: 4, name: 'Tarjeta de Débito', code: 'debit_card', requires_reference: true },
      { id: 5, name: 'Pago por Aplicación', code: 'app_payment', requires_reference: true },
    ];
    (async () => {
      try {
        if (!localStorage.getItem('access_token')) { setPaymentMethods(fallback); return; }
        const methods = await saleService.getPaymentMethods();
        if (methods?.length) { setPaymentMethods(translatePaymentMethods(methods)); setSelectedPaymentMethodId(methods[0].id); }
        else { setPaymentMethods(fallback); }
      } catch { setPaymentMethods(fallback); }
    })();
  }, []);

  useEffect(() => {
    if (saleItems.length > 0 && selectedPatient) {
      const pending = saleItems.filter((i) => i.has_discounts === true && i.discount === 0);
      if (pending.length > 0) setTimeout(() => applyBestDiscountAutomatically(pending[0]), 300);
    }
  }, [saleItems, selectedPatient]);

  const applyDiscount = (discountItem: Discount) => {
    setSelectedDiscount(discountItem);
    const pct = typeof discountItem.discount_percentage === 'string'
      ? parseFloat(discountItem.discount_percentage) : discountItem.discount_percentage as number;
    if (saleItems.length > 0) {
      const updated = [...saleItems];
      const first = { ...updated[0] };
      const gross = first.price * first.quantity;
      const amt = (gross * pct) / 100;
      first.discount = amt; first.total = gross - amt;
      updated[0] = first;
      setSaleItems(updated);
    } else {
      setDiscount((price * quantity * pct) / 100);
    }
    toast({ title: 'Descuento aplicado', description: `Se ha aplicado un descuento del ${discountItem.discount_percentage}%` });
    setIsDiscountSelectionOpen(false);
  };

  const addProductToSale = () => {
    if (!productDescription || price <= 0 || quantity <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe completar la información del producto.' });
      return;
    }
    setIsSummaryLoading(true);
    let fp = price;
    if (selectedLens?.id) {
      const adj = sessionPriceAdjustmentService.getAdjustment(selectedLens.id);
      fp = adj ? adj.adjustedPrice : price;
    }
    const discAmt = discount > 0 ? (fp * quantity * discount) / 100 : 0;
    const newItem: SaleItem = {
      id: generateId(),
      lens: { id: selectedLens?.id || parseInt(productCode) || Math.floor(Math.random() * 1000000), name: productDescription, price: fp.toString() },
      description: productDescription, quantity, price: fp, discount: discAmt, total: fp * quantity - discAmt,
      has_discounts: selectedLens?.has_discounts || false,
    };
    setSaleItems((prev) => [...prev, newItem]);
    setProductDescription(''); setProductCode(''); setPrice(0); setQuantity(1); setDiscount(0); setSelectedLens(null);
    if ((selectedLens?.has_discounts || newItem.has_discounts) && selectedPatient) {
      setTimeout(() => applyBestDiscountAutomatically(newItem), 500);
    } else { setIsSummaryLoading(false); }
    toast({ title: 'Producto agregado', description: 'El producto se ha agregado al carrito' });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setSaleItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const currentGross = item.price * item.quantity;
      const pct = currentGross > 0 ? (item.discount / currentGross) * 100 : 0;
      const newGross = item.price * qty;
      const newDiscount = (newGross * pct) / 100;
      return { ...item, quantity: qty, discount: newDiscount, total: newGross - newDiscount };
    }));
  };

  const addProductDirect = (lens: Lens, qty: number = 1) => {
    const existing = saleItems.find((i) => i.lens.id === lens.id);
    if (existing) {
      toast({ title: 'Ya en el carrito', description: 'Este producto ya fue agregado.' });
      return;
    }
    setIsSummaryLoading(true);
    const basePrice = parseFloat(lens.price?.toString() ?? '0') || 0;
    const adj = sessionPriceAdjustmentService.getAdjustment(lens.id);
    const fp = adj ? adj.adjustedPrice : basePrice;
    const metaParts = [
      lens.brand?.name,
      lens.type?.name ?? lens.lens_type?.name,
      lens.material?.name,
    ].filter(Boolean);
    const newItem: SaleItem = {
      id: generateId(),
      lens: { id: lens.id, name: lens.description, price: fp.toString() },
      description: lens.description,
      quantity: qty,
      price: fp,
      discount: 0,
      total: fp * qty,
      has_discounts: lens.has_discounts ?? false,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    };
    setSaleItems((prev) => [...prev, newItem]);
    if (newItem.has_discounts && selectedPatient) {
      setTimeout(() => applyBestDiscountAutomatically(newItem), 500);
    } else {
      setIsSummaryLoading(false);
    }
    toast({ title: 'Producto agregado', description: 'El producto se ha agregado al carrito' });
  };

  const removeItem = (itemId: string) => setSaleItems((prev) => prev.filter((i) => i.id !== itemId));

  const handleDiscountSuccess = (discountData: DiscountData) => {
    if (discountData) applyDiscount(discountData);
    setIsDiscountModalOpen(false);
  };

  const submitSale = async () => {
    if (!selectedPatient) { toast({ variant: 'destructive', title: 'Error', description: 'Por favor seleccione un cliente para la venta' }); return; }
    if (saleItems.length === 0) { toast({ variant: 'destructive', title: 'Error', description: 'Por favor agregue al menos un producto a la venta' }); return; }
    if (!paymentMethods.find((m) => m.id === selectedPaymentMethodId)) { toast({ variant: 'destructive', title: 'Error', description: 'Por favor seleccione un método de pago' }); return; }
    try {
      setIsLoading(true);
      let currentPatient = selectedPatient;
      const rawSub = saleItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const totalDisc = saleItems.reduce((s, i) => s + i.discount, 0);
      const calcTax = Math.round((rawSub - totalDisc) * 0.19 * 100) / 100;
      const calcTotal = rawSub - totalDisc + calcTax;
      const items = saleItems.map((i) => ({ lens_id: i.lens.id, quantity: i.quantity, price: i.price, discount: i.discount, total: i.total }));
      const paymentData = { payment_method_id: selectedPaymentMethodId, amount: isPartialPayment ? parseFloat(paymentAmount) : calcTotal, reference_number: paymentReference, payment_date: salesDate, notes: customerNote };
      const containsLenses = items.some((i) => i.lens_id);
      const lensItems = items.filter((i) => i.lens_id).map((i) => ({ lens_id: i.lens_id, quantity: i.quantity, price: i.price }));
      const saleData = { patient_id: Number(currentPatient.id), order_id: null, appointment_id: null, subtotal: rawSub, tax: calcTax, discount: totalDisc, total: calcTotal, notes: customerNote, payments: [paymentData], is_partial_payment: isPartialPayment, items, contains_lenses: containsLenses, lens_items: lensItems };

      if (!currentPatient) {
        const stored = sessionStorage.getItem('pendingSale');
        if (stored) {
          const p = JSON.parse(stored);
          if (p.patientId && p.patientName) { currentPatient = { id: Number(p.patientId), first_name: p.patientName.split(' ')[0] || '', last_name: p.patientName.split(' ').slice(1).join(' ') || '', identification: '', email: '', phone: '' }; setSelectedPatient(currentPatient); }
        }
      }

      const patientId = Number(currentPatient.id);
      if (!currentPatient.id || isNaN(patientId) || patientId <= 0) { toast({ variant: 'destructive', title: 'Error', description: 'ID de paciente inválido. Por favor regrese e inicie la venta nuevamente.' }); return; }

      const result = await saleService.createSale(saleData);
      let saleResult: SaleApiResponse;
      if (result && typeof result === 'object' && 'data' in result) saleResult = (result as { data: SaleApiResponse }).data;
      else saleResult = result as unknown as SaleApiResponse;
      if (!saleResult?.id) throw new Error('Invalid response structure from server');

      const hasLab = saleResult.laboratoryOrders && saleResult.laboratoryOrders.length > 0;
      let desc = `Venta ${saleResult.sale_number || 'nueva'} creada exitosamente.`;
      if (hasLab) { const c = saleResult.laboratoryOrders!.length; desc += ` Se ${c === 1 ? 'ha creado' : 'han creado'} ${c} orden${c === 1 ? '' : 'es'} de laboratorio automáticamente.`; }
      toast({ title: 'Venta completada', description: desc, duration: hasLab ? 8000 : 5000 });

      if (saleResult.guest_pdf_url) window.open(saleResult.guest_pdf_url, '_blank');
      else if (saleResult.pdf_url) window.open(saleResult.pdf_url, '_blank');

      sessionStorage.removeItem('pendingSale');
      navigate('/receptionist/dashboard');
    } catch (error) {
      console.error('Error creating sale:', error);
      let msg = 'No se pudo completar la venta. Intente nuevamente.';
      if (error && typeof error === 'object') {
        if ('response' in error && error.response) { const r = error.response as { data?: { message?: string; errors?: Record<string, string[]> } }; if (r.data?.message) msg = r.data.message; else if (r.data?.errors) msg = Object.values(r.data.errors).flat().join(', '); }
        else if ('message' in error && typeof error.message === 'string') msg = error.message;
      }
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally { setIsLoading(false); }
  };

  return {
    saleItems, subtotal, tax, total, documentNumber, customerNote, setCustomerNote,
    isLoading, selectedPatient, setSelectedPatient,
    paymentReference, setPaymentReference, productType, setProductType,
    productDescription, setProductDescription, productCode, setProductCode,
    quantity, setQuantity, price, setPrice, discount, setDiscount,
    salesDate, setSalesDate, isDiscountModalOpen, setIsDiscountModalOpen,
    selectedLens, setSelectedLens, paymentMethods, selectedPaymentMethodId, setSelectedPaymentMethodId,
    isPartialPayment, setIsPartialPayment, paymentAmount, setPaymentAmount,
    availableDiscounts, selectedDiscount, isDiscountSelectionOpen, setIsDiscountSelectionOpen,
    isSummaryLoading, isDiscountInfoModalOpen, setIsDiscountInfoModalOpen, appliedDiscountInfo,
    applyDiscount, handleDiscountSuccess, addProductToSale, addProductDirect, removeItem, updateQuantity, submitSale,
    appointmentId,
  };
}
