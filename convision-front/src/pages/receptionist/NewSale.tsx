import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  User, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Tag, 
  Trash, 
  Plus,
  AlertCircle,
  Calendar,
  Search,
  Receipt,
  CreditCard,
  Trash2,
  Calculator,
  Percent as PercentIcon,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/contexts/AuthContext';
import { patientService } from '@/services/patientService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import DiscountRequestModal from '@/components/discounts/DiscountRequestModal';
import api from '@/lib/axios';
import { Textarea } from '@/components/ui/textarea';
import { saleService, PaymentMethod } from '@/services/saleService';
import { translatePaymentMethods } from '@/lib/translations';
import { Checkbox } from '@/components/ui/checkbox';
import { discountService, Discount } from '@/services/discountService';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';

// Define interface for lens data from sessionStorage
interface SessionLens {
  id: number;
  description: string;
  internal_code: string;
  identifier: string;
  price: string | number;
  has_discounts?: boolean;
}

// Define DiscountData interface with explicit properties
interface DiscountData {
  id: number;
  lens_id: number;
  patient_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  discount_percentage: number;
  original_price: number;
  discounted_price: number;
  reason?: string;
  rejection_reason?: string;
  approved_by?: number;
  expiry_date?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

// Define our own Lens interface to avoid dependency on lensService
interface Lens {
  id: number;
  name: string;
  price: string;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email: string;
  phone: string;
}

interface PatientApiResponse {
  data: Patient;
}

interface SaleApiResponse {
  id: number;
  sale_number: string;
  patient_id: number;
  appointment_id?: number | null;
  laboratory_id?: number | null;
  quote_id?: number | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status?: string | null;
  payment_status: string;
  notes?: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  patient?: unknown;
  items?: unknown[];
  createdBy?: unknown;
  laboratoryOrders?: unknown[];
  pdf_token?: string;
  pdf_url?: string;
  guest_pdf_url?: string;
}

interface SaleItem {
  id: string; // UUID for the item
  lens: Lens;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  has_discounts?: boolean; // Agregar esta propiedad para rastrear si el producto tiene descuentos
}

// Constantes para mensajes de usuario
const MESSAGES = {
  loading: {
    calculating: "Calculando precios y descuentos...",
    processing: "Procesando información...",
  },
  errors: {
    product: {
      incomplete: "Debe completar la información del producto.",
      noPatient: "Debe seleccionar un cliente antes de aplicar un descuento.",
    },
    discount: {
      notAvailable: "No hay descuentos disponibles para este producto",
      error: "No se pudieron obtener los descuentos disponibles.",
    },
    sale: {
      incomplete: "No se pudo cargar la información de la venta pendiente.",
    }
  },
  success: {
    discount: {
      applied: (percentage: number) => `Se ha aplicado un descuento del ${percentage}%`,
      autoApplied: (percentage: number) => `Se ha aplicado automáticamente un descuento del ${percentage}%`,
    },
    product: {
      added: "El producto se ha agregado al carrito",
    }
  },
  labels: {
    verifyDiscounts: "Ver descuentos disponibles",
    noDiscounts: "Sin descuentos disponibles",
    autoApplied: "Descuento aplicado automáticamente",
    noProducts: "No hay productos agregados",
    addProducts: "Agregue productos para completar la venta",
  }
};

const NewSale: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [documentNumber, setDocumentNumber] = useState(generateDocumentNumber());
  const [customerNote, setCustomerNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isCompanySale, setIsCompanySale] = useState(false);
  const [productType, setProductType] = useState('glasses');
  const [productDescription, setProductDescription] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [itemAmount, setItemAmount] = useState(0);
  const [salesDate, setSalesDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<{
    id: number;
    internal_code: string;
    identifier: string;
    description: string;
    price: number;
    has_discounts?: boolean; // Agregar esta propiedad
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number>(1); // Default to first payment method
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [isDiscountSelectionOpen, setIsDiscountSelectionOpen] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false); // Estado para controlar el spinner
  const [isDiscountInfoModalOpen, setIsDiscountInfoModalOpen] = useState(false);
  const [appliedDiscountInfo, setAppliedDiscountInfo] = useState<{
    percentage: number;
    amount: number;
    originalPrice: number;
    finalPrice: number;
  } | null>(null);

  // Calculate item amount when price or quantity changes
  useEffect(() => {
    setItemAmount(price * quantity);
  }, [price, quantity]);
  
  // Load pending sale data from session storage
  useEffect(() => {
    const storedSaleData = sessionStorage.getItem('pendingSale');
    
    if (storedSaleData) {
      try {
        setIsSummaryLoading(true); // Activar spinner mientras se carga la información
        const parsedData = JSON.parse(storedSaleData);
        console.log('Datos cargados de sessionStorage:', parsedData);
        console.log('parsedData.patientId:', parsedData.patientId);
        console.log('parsedData.patientName:', parsedData.patientName);
        
        // If there are selected lenses (multiple), process them
        if (parsedData.selectedLenses && Array.isArray(parsedData.selectedLenses) && parsedData.selectedLenses.length > 0) {
          const lenses = parsedData.selectedLenses;
          console.log('Lentes cargados desde sessionStorage:', lenses);
          
          // Create sale items for each lens
          const newSaleItems: SaleItem[] = lenses.map((lens: SessionLens) => {
            const baseLensPrice = parseFloat(lens.price.toString()) || 0;
            // Check for session price adjustments
            const adjustment = sessionPriceAdjustmentService.getAdjustment(lens.id);
            const finalPrice = adjustment ? adjustment.adjustedPrice : baseLensPrice;
            
            return {
              id: generateId(),
              lens: { 
                id: lens.id, 
                name: lens.description, 
                price: finalPrice.toString()
              },
              description: lens.description,
              quantity: 1,
              price: finalPrice,
              discount: 0,
              total: finalPrice,
              has_discounts: lens.has_discounts
            };
          });
          
          setSaleItems(newSaleItems);
          
          // If there's patient data, load it
          let patientLoaded = false;
          
          if (parsedData.patientId) {
            // Create a basic patient object
            const tempPatient = {
              id: Number(parsedData.patientId), // Ensure it's a number
              first_name: parsedData.patientName?.split(' ')[0] || '',
              last_name: parsedData.patientName?.split(' ').slice(1).join(' ') || '',
              identification: '',
              email: '',
              phone: ''
            };
            
            // Set the patient
            setSelectedPatient(tempPatient);
            patientLoaded = true;
            
            // Fetch complete patient data from API
            fetchPatientData(Number(parsedData.patientId));
          }
          
          // Apply discounts automatically for lenses that have them
          if (patientLoaded) {
            console.log('Aplicando descuentos automáticamente para múltiples lentes...');
            
            // Use setTimeout to ensure patient state is set before applying discounts
            setTimeout(() => {
              newSaleItems.forEach((item) => {
                if (item.has_discounts) {
                  console.log('Aplicando descuento automático para:', item.description);
                  applyBestDiscountAutomatically(item);
                }
              });
              // Set loading to false after a delay if no discounts are being applied
              const itemsWithDiscounts = newSaleItems.filter(item => item.has_discounts);
              if (itemsWithDiscounts.length === 0) {
                setTimeout(() => setIsSummaryLoading(false), 500);
              }
            }, 1000);
          } else {
            console.log('No se aplicaron descuentos automáticamente porque no hay paciente seleccionado');
            setTimeout(() => setIsSummaryLoading(false), 500);
          }
        }
        // Legacy support: If there's a single selected lens (old format)
        else if (parsedData.selectedLens) {
          const lens = parsedData.selectedLens;
          console.log('Lente individual cargado desde sessionStorage (formato legacy):', lens);
          
          // Set lens data to product fields
          setProductDescription(lens.description || '');
          setProductCode(lens.internal_code || lens.identifier || '');
          setPrice(parseFloat(lens.price) || 0);
          
          // Set the selected lens
          setSelectedLens({
            id: lens.id,
            internal_code: lens.internal_code,
            identifier: lens.identifier,
            description: lens.description,
            price: parseFloat(lens.price) || 0,
            has_discounts: lens.has_discounts
          });
          
          // Automatically add the lens to the sale items
          const baseLensPrice = parseFloat(lens.price) || 0;
          // Check for session price adjustments
          const adjustment = sessionPriceAdjustmentService.getAdjustment(lens.id);
          const finalPrice = adjustment ? adjustment.adjustedPrice : baseLensPrice;
          
          const newItem: SaleItem = {
            id: generateId(),
            lens: { 
              id: lens.id, 
              name: lens.description, 
              price: finalPrice.toString()
            },
            description: lens.description,
            quantity: 1,
            price: finalPrice,
            discount: 0,
            total: finalPrice,
            has_discounts: lens.has_discounts
          };
          
          setSaleItems([newItem]);
          
          // Reset product fields after adding to sale
          setProductDescription('');
          setProductCode('');
          setPrice(0);
          setDiscount(0);
          setItemAmount(0);
          
          // If there's patient data, load it
          let patientLoaded = false;
          
          if (parsedData.patientId) {
            // Create a basic patient object
            const tempPatient = {
              id: Number(parsedData.patientId), // Ensure it's a number
              first_name: parsedData.patientName?.split(' ')[0] || '',
              last_name: parsedData.patientName?.split(' ').slice(1).join(' ') || '',
              identification: '',
              email: '',
              phone: ''
            };
            
            // Set the patient
            setSelectedPatient(tempPatient);
            patientLoaded = true;
            
            // Fetch complete patient data from API
            fetchPatientData(Number(parsedData.patientId));
          }
          
          // Check if lens has discounts flag
          const hasDiscounts = lens.has_discounts === true;
          console.log('Verificación explícita de has_discounts:', hasDiscounts);
          
          // If lens has discounts and we have a patient, apply best discount automatically
          if (hasDiscounts && patientLoaded) {
            console.log('Lente tiene descuentos disponibles, aplicando automáticamente...');
            
            // Use setTimeout to ensure patient state is set before applying discount
            setTimeout(() => {
              console.log('Iniciando aplicación automática de descuento');
              applyBestDiscountAutomatically(newItem);
            }, 1000);
          } else {
            console.log('No se aplicaron descuentos automáticamente porque:', 
              !hasDiscounts ? 'el lente no tiene descuentos' : 'no hay paciente seleccionado');
            
            // Si no hay descuentos, terminamos la carga
            setTimeout(() => setIsSummaryLoading(false), 500);
          }
        }
        // If there's patient data but no lenses
        else if (parsedData.patientId && parsedData.patientName) {
          // We only have partial patient data, but we can create a basic patient object
          const tempPatient = {
            id: Number(parsedData.patientId), // Ensure it's a number
            first_name: parsedData.patientName.split(' ')[0] || '',
            last_name: parsedData.patientName.split(' ').slice(1).join(' ') || '',
            identification: '',
            email: '',
            phone: ''
          };
          
          console.log('Setting patient with basic data (no lenses):', tempPatient);
          setSelectedPatient(tempPatient);
          
          // Fetch the complete patient data from API
          console.log('Fetching complete patient data...');
          fetchPatientData(Number(parsedData.patientId));
          
          // Terminamos la carga ya que no hay lente con descuento
          setTimeout(() => setIsSummaryLoading(false), 500);
        } else {
          // No hay datos suficientes para aplicar descuentos
          setTimeout(() => setIsSummaryLoading(false), 500);
        }
        
        // Set current date for the sale
        setSalesDate(format(new Date(), 'yyyy-MM-dd'));
      } catch (error) {
        console.error('Error parsing stored sale data:', error);
        setIsSummaryLoading(false); // Desactivar spinner en caso de error
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cargar la información de la venta pendiente.',
        });
      }
    }
  }, []);
  
  // Function to fetch complete patient data
  const fetchPatientData = async (patientId: number) => {
    try {
      console.log('fetchPatientData called with ID:', patientId);
      
      // Check if we have a token before making the API call
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('No authentication token found, skipping patient data fetch');
        return;
      }
      
      console.log('Fetching patient data from API...');
      const response = await patientService.getPatient(patientId);
      console.log('Patient response received from API:', response);
      
      // Extract patient data from the response wrapper if it exists
      let patient: Patient;
      if (response && typeof response === 'object' && 'data' in response) {
        patient = (response as PatientApiResponse).data;
      } else {
        patient = response as Patient;
      }
      console.log('Extracted patient data:', patient);
      
      if (patient && patient.id) {
        console.log('Setting complete patient data:', patient);
        setSelectedPatient(patient);
      } else {
        console.log('No valid patient data received from API');
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      // We don't show an error toast here as we already have basic patient info
      // Instead of failing, we'll continue with the basic patient info we have
    }
  };
  
  // Calculate totals whenever sale items change
  useEffect(() => {
    // Calculate the total discount amount from all items
    const totalDiscount = saleItems.reduce((acc, item) => acc + item.discount, 0);
    
    // Calculate the raw subtotal (before discounts)
    const rawSubtotal = saleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Calculate the net subtotal (after discounts)
    const netSubtotal = rawSubtotal - totalDiscount;
    
    // Update subtotal state
    setSubtotal(netSubtotal);
    
    // Calculate tax on the discounted amount
    const calculatedTax = netSubtotal * 0.19;
    setTax(calculatedTax);
    
    // Calculate total with tax
    setTotal(netSubtotal + calculatedTax);
  }, [saleItems]);
  
  // Fetch payment methods from backend
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        // Check if we have a token before making the API call
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.log('No authentication token found, skipping payment methods fetch');
          // Set default payment methods as fallback when not authenticated
          const fallbackMethods: PaymentMethod[] = [
            { id: 1, name: 'Efectivo', code: 'cash', requires_reference: false },
            { id: 2, name: 'Tarjeta de Crédito', code: 'credit_card', requires_reference: true },
            { id: 3, name: 'Transferencia Bancaria', code: 'transfer', requires_reference: true },
            { id: 4, name: 'Tarjeta de Débito', code: 'debit_card', requires_reference: true },
            { id: 5, name: 'Pago por Aplicación', code: 'app_payment', requires_reference: true }
          ];
          setPaymentMethods(fallbackMethods);
          setSelectedPaymentMethodId(1);
          return;
        }
        
        const methods = await saleService.getPaymentMethods();
        
        if (methods && methods.length > 0) {
          // Translate payment method names from English to Spanish
          const translatedMethods = translatePaymentMethods(methods);
          setPaymentMethods(translatedMethods);
          setSelectedPaymentMethodId(methods[0].id);
        } else {
          // Fallback if no methods are returned
          const fallbackMethods: PaymentMethod[] = [
            { id: 1, name: 'Efectivo', code: 'cash', requires_reference: false },
            { id: 2, name: 'Tarjeta de Crédito', code: 'credit_card', requires_reference: true },
            { id: 3, name: 'Transferencia Bancaria', code: 'transfer', requires_reference: true },
            { id: 4, name: 'Tarjeta de Débito', code: 'debit_card', requires_reference: true },
            { id: 5, name: 'Pago por Aplicación', code: 'app_payment', requires_reference: true }
          ];
          setPaymentMethods(fallbackMethods);
          setSelectedPaymentMethodId(1);
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
        
        // Use fallback payment methods on error
        const fallbackMethods: PaymentMethod[] = [
          { id: 1, name: 'Efectivo', code: 'cash', requires_reference: false },
          { id: 2, name: 'Tarjeta de Crédito', code: 'credit_card', requires_reference: true },
          { id: 3, name: 'Transferencia Bancaria', code: 'transfer', requires_reference: true },
          { id: 4, name: 'Tarjeta de Débito', code: 'debit_card', requires_reference: true },
          { id: 5, name: 'Pago por Aplicación', code: 'app_payment', requires_reference: true }
        ];
        setPaymentMethods(fallbackMethods);
        setSelectedPaymentMethodId(1);
        
        // Only show toast if we have a token but the request still failed
        if (localStorage.getItem('access_token')) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron cargar los métodos de pago. Usando métodos por defecto.'
          });
        }
      }
    };
    
    fetchPaymentMethods();
  }, []);
  
  // Generate a document number for the sale
  function generateDocumentNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SALE-${year}${month}${day}-${random}`;
  }
  
  // Search for patients
  const searchPatients = async () => {
    if (patientSearchTerm.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingrese al menos 3 caracteres para buscar pacientes.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await patientService.searchPatients({
        search: patientSearchTerm,
        page: 1,
        perPage: 10
      });
      setPatients(response.data);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los pacientes.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Select a patient from search results
  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientSearch(false);
  };
  
  // Generate a random ID for sale items
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };
  
  // Modify the fetchAvailableDiscounts function to handle the loading state better
  const fetchAvailableDiscounts = async () => {
    console.log('=== Iniciando verificación de descuentos ===');
    console.log('Lens seleccionado:', selectedLens);
    console.log('Paciente seleccionado:', selectedPatient);
    
    // Aseguramos que el estado de carga esté activo
    setIsSummaryLoading(true);
    
    // Check if we have both product and patient selected
    if (!selectedPatient) {
      console.log('No hay paciente seleccionado para verificar descuentos');
      toast({
        title: "Información incompleta",
        description: MESSAGES.errors.product.noPatient,
      });
      setIsSummaryLoading(false);
      return;
    }

    if (!selectedLens) {
      console.log('No hay lente seleccionado para verificar descuentos');
      toast({
        title: "Información incompleta",
        description: MESSAGES.errors.product.incomplete,
      });
      setIsSummaryLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the lens ID from selectedLens 
      const lensId = selectedLens.id;
      console.log(`Verificando descuentos para lente ID: ${lensId} y paciente ID: ${selectedPatient.id}`);
      
      // Fetch all available discounts
      console.log('Llamando a API de descuentos activos...');
      console.log(`URL de solicitud: /api/v1/active-discounts?lens_id=${lensId}&patient_id=${selectedPatient.id}`);
      
      const discounts = await discountService.getActiveDiscounts(lensId, selectedPatient.id);
      console.log('Descuentos recibidos de API:', JSON.stringify(discounts, null, 2));
      
      if (!discounts || discounts.length === 0) {
        console.log('No hay descuentos disponibles para este lente y paciente');
        toast({
          title: "Sin descuentos",
          description: MESSAGES.errors.discount.notAvailable
        });
        setIsLoading(false);
        setIsSummaryLoading(false);
        return;
      }
      
      // Store the available discounts
      setAvailableDiscounts(discounts);
      console.log(`Se encontraron ${discounts.length} descuentos disponibles`);
      
      // Find the best discount (highest percentage)
      const bestDiscount = discounts.sort((a, b) => 
        b.discount_percentage - a.discount_percentage
      )[0];
      
      console.log('Mejor descuento encontrado:', bestDiscount);
      
      // Apply the best discount automatically
      if (bestDiscount) {
        console.log(`Aplicando automáticamente descuento de ${bestDiscount.discount_percentage}%`);
        
        // Store the selected discount first
        setSelectedDiscount(bestDiscount);
        
        // Update sale items with the discount
        if (saleItems.length > 0) {
          const updatedItems = [...saleItems];
          const firstItem = {...updatedItems[0]};
          
          // Calculate discount amount based on percentage
          const grossAmount = firstItem.price * firstItem.quantity;
          const discountAmount = (grossAmount * bestDiscount.discount_percentage) / 100;
          console.log(`Monto bruto: ${grossAmount}, Descuento calculado: ${discountAmount}`);
          
          firstItem.discount = discountAmount;
          firstItem.total = grossAmount - discountAmount;
          
          updatedItems[0] = firstItem;
          
          // Update the state with the MODIFIED items - using a callback to ensure we're updating
          // from the current state, not a closure value that might be stale
          console.log('Items de venta ANTES de actualizar:', saleItems);
          setSaleItems(updatedItems);
          console.log('Items de venta DESPUÉS de actualizar:', updatedItems);
          
          // Forzar actualización de totales
          const rawSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          const totalDiscount = updatedItems.reduce((acc, item) => acc + item.discount, 0);
          const netSubtotal = rawSubtotal - totalDiscount;
          const calculatedTax = netSubtotal * 0.19;
          
          // Actualizar estados para reflejar los nuevos valores
          setSubtotal(netSubtotal);
          setTax(calculatedTax);
          setTotal(netSubtotal + calculatedTax);
          
          // Guardar información del descuento para mostrar en el modal
          setAppliedDiscountInfo({
            percentage: bestDiscount.discount_percentage,
            amount: discountAmount,
            originalPrice: grossAmount,
            finalPrice: grossAmount - discountAmount
          });
          
          // Mostrar el modal informativo con la información del descuento
          setIsDiscountInfoModalOpen(true);
        }
      }
      
      // Show discount selection dialog to let user see all available options
      setIsDiscountSelectionOpen(true);
    } catch (error) {
      console.error('Error obteniendo descuentos:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: MESSAGES.errors.discount.error,
      });
    } finally {
      setIsLoading(false);
      setIsSummaryLoading(false); // Desactivar spinner cuando termine la operación
    }
  };

  // Modify the openDiscountModal function
  const openDiscountModal = () => {
    if (!productDescription || price <= 0 || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: MESSAGES.errors.product.incomplete,
      });
      return;
    }
    
    // Ensure we have a valid patient selected
    if (!selectedPatient) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: MESSAGES.errors.product.noPatient,
      });
      return;
    }
    
    // First try to fetch existing discounts
    fetchAvailableDiscounts();
    
    // If we need to create a new discount, prepare the lens object
    const lensForDiscount = {
      id: parseInt(productCode) || Math.floor(Math.random() * 1000000), // Generate a temporary ID
      internal_code: productCode || 'TEMP-' + Date.now(),
      identifier: productCode || 'Producto Personalizado',
      description: productDescription,
      price: price
    };
    
    setSelectedLens(lensForDiscount);
    
    // Only open the discount creation modal if there are no available discounts
    if (availableDiscounts.length === 0) {
      setIsDiscountModalOpen(true);
    }
  };

  // Add a function to apply a selected discount
  const applyDiscount = (discount: Discount) => {
    console.log('Aplicando descuento:', discount);
    
    // Store the selected discount
    setSelectedDiscount(discount);
    
    // Update the discount state with proper type handling
    let discountPercentage: number;
    if (typeof discount.discount_percentage === 'string') {
      discountPercentage = parseFloat(discount.discount_percentage);
    } else {
      discountPercentage = discount.discount_percentage as number;
    }
    
    console.log(`Aplicando descuento de ${discountPercentage}%`);
    
    // Check if there are any sale items to update
    if (saleItems.length > 0) {
      // Get a copy of the first item (assuming the discount applies to the first item)
      const updatedItems = [...saleItems];
      const firstItem = {...updatedItems[0]};
      
      // Calculate discount amount based on percentage
      const grossAmount = firstItem.price * firstItem.quantity;
      const discountAmount = (grossAmount * discountPercentage) / 100;
      
      console.log(`Monto bruto: ${grossAmount}, Descuento calculado: ${discountAmount}`);
      
      // Update the item with the discount
      firstItem.discount = discountAmount;
      firstItem.total = grossAmount - discountAmount;
      updatedItems[0] = firstItem;
      
      // Update the state with the modified item
      setSaleItems(updatedItems);
      
      // Forzar actualización de totales
      const rawSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const totalDiscount = updatedItems.reduce((acc, item) => acc + item.discount, 0);
      const netSubtotal = rawSubtotal - totalDiscount;
      const calculatedTax = netSubtotal * 0.19;
      
      // Actualizar estados para reflejar los nuevos valores
      setSubtotal(netSubtotal);
      setTax(calculatedTax);
      setTotal(netSubtotal + calculatedTax);
      
      console.log('Items de venta actualizados con descuento:', updatedItems);
      console.log('Nuevos totales - Subtotal:', netSubtotal, 'Impuesto:', calculatedTax, 'Total:', netSubtotal + calculatedTax);
    } else {
      // If there are no sale items yet, just calculate based on the current price
      const grossAmount = price * quantity;
      const discountAmount = (grossAmount * discountPercentage) / 100;
      
      console.log(`Sin items, precio actual: ${price}, cantidad: ${quantity}`);
      console.log(`Monto bruto: ${grossAmount}, Descuento calculado: ${discountAmount}`);
      
      // Just update the discount field
      setDiscount(discountAmount);
    }
    
    // Show confirmation toast
    toast({
      title: 'Descuento aplicado',
      description: MESSAGES.success.discount.applied(discount.discount_percentage)
    });
    
    // Close the discount selection dialog
    setIsDiscountSelectionOpen(false);
  };

  // Update the handleDiscountSuccess function to use the new applyDiscount function
  const handleDiscountSuccess = (discountData: DiscountData) => {
    console.log('Discount data received:', discountData);
    
    if (discountData) {
      applyDiscount(discountData);
    }
    
    // Close the discount creation modal
    setIsDiscountModalOpen(false);
  };
  
  // Modificar la función addProductToSale para aplicar automáticamente el descuento
  const addProductToSale = () => {
    if (!productDescription || price <= 0 || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: MESSAGES.errors.product.incomplete,
      });
      return;
    }
    
    // Activar spinner mientras se procesa
    setIsSummaryLoading(true);
    
    // Generar un ID único para el artículo
    const itemId = generateId();
    
    // Check for session price adjustments if we have a selected lens
    let finalPrice = price;
    if (selectedLens?.id) {
      const adjustment = sessionPriceAdjustmentService.getAdjustment(selectedLens.id);
      finalPrice = adjustment ? adjustment.adjustedPrice : price;
    }
    
    // Calculate the item total based on final price and quantity
    const itemTotal = finalPrice * quantity;
    
    // Create a new lens object from the form data
    const newItem: SaleItem = {
      id: itemId,
      lens: {
        id: selectedLens?.id || parseInt(productCode) || Math.floor(Math.random() * 1000000),
        name: productDescription,
        price: finalPrice.toString()
      },
      description: productDescription,
      quantity: quantity,
      price: finalPrice,
      discount: 0, // Iniciar sin descuento
      total: itemTotal,
      has_discounts: selectedLens?.has_discounts || false // Agregar propiedad has_discounts
    };
    
    // Add the new item to the cart
    const updatedItems = [...saleItems, newItem];
    setSaleItems(updatedItems);
    
    // Reset form fields
    setProductDescription('');
    setProductCode('');
    setPrice(0);
    setQuantity(1);
    setItemAmount(0);
    
    // Si el producto tiene descuentos y hay un paciente seleccionado, verificar descuentos automáticamente
    if ((selectedLens?.has_discounts || newItem.has_discounts) && selectedPatient) {
      // Pequeño delay para asegurar que el estado se ha actualizado
      setTimeout(() => {
        // Aplicar automáticamente el mejor descuento disponible sin requerir interacción manual
        applyBestDiscountAutomatically(newItem);
      }, 500);
    } else {
      // Si no hay descuentos o no hay paciente, terminamos la carga
      setIsSummaryLoading(false);
    }
    
    toast({
      title: 'Producto agregado',
      description: MESSAGES.success.product.added,
    });
  };
  
  // Nueva función para aplicar automáticamente el mejor descuento disponible
  const applyBestDiscountAutomatically = async (item: SaleItem) => {
    try {
      console.log('=== Aplicando automáticamente el mejor descuento ===');
      console.log('Item:', item);
      console.log('Paciente seleccionado:', selectedPatient);
      
      if (!selectedPatient) {
        console.log('No hay paciente seleccionado para aplicar descuento');
        setIsSummaryLoading(false);
        return;
      }

      // Usar el ID del lente del item
      const lensId = item.lens.id;
      console.log(`Buscando mejor descuento para lente ID: ${lensId} y paciente ID: ${selectedPatient.id}`);
      
      // Obtener directamente el mejor descuento usando el servicio
      const bestDiscount = await discountService.getBestDiscount(lensId, selectedPatient.id);
      console.log('Mejor descuento encontrado:', bestDiscount);
      
      if (!bestDiscount) {
        console.log('No se encontraron descuentos disponibles');
        setIsSummaryLoading(false);
        return;
      }
      
      // Guardar el descuento seleccionado
      setSelectedDiscount(bestDiscount);
      
      // Obtener todos los descuentos disponibles
      const allDiscounts = await discountService.getActiveDiscounts(lensId, selectedPatient.id);
      setAvailableDiscounts(allDiscounts);
      
      // Buscar el item en los items actuales
      const updatedItems = [...saleItems];
      const itemIndex = updatedItems.findIndex(i => i.id === item.id);
      
      if (itemIndex >= 0) {
        // Aplicar el descuento al item
        const itemToUpdate = {...updatedItems[itemIndex]};
        const grossAmount = itemToUpdate.price * itemToUpdate.quantity;
        const discountPercentage = typeof bestDiscount.discount_percentage === 'string' 
          ? parseFloat(bestDiscount.discount_percentage) 
          : bestDiscount.discount_percentage;
          
        const discountAmount = (grossAmount * discountPercentage) / 100;
        
        // Actualizar el item con el descuento
        itemToUpdate.discount = discountAmount;
        itemToUpdate.total = grossAmount - discountAmount;
        updatedItems[itemIndex] = itemToUpdate;
        
        // Actualizar el estado con los items modificados
        setSaleItems(updatedItems);
        
        // Forzar actualización de totales
        const rawSubtotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const totalDiscount = updatedItems.reduce((acc, item) => acc + item.discount, 0);
        const netSubtotal = rawSubtotal - totalDiscount;
        const calculatedTax = netSubtotal * 0.19;
        
        // Actualizar estados para reflejar los nuevos valores
        setSubtotal(netSubtotal);
        setTax(calculatedTax);
        setTotal(netSubtotal + calculatedTax);
        
        // Guardar información del descuento para mostrar en el modal
        setAppliedDiscountInfo({
          percentage: discountPercentage,
          amount: discountAmount,
          originalPrice: grossAmount,
          finalPrice: grossAmount - discountAmount
        });
        
        // Mostrar el modal informativo con la información del descuento
        setIsDiscountInfoModalOpen(true);
      }
    } catch (error) {
      console.error('Error aplicando descuento automático:', error);
    } finally {
      setIsSummaryLoading(false);
    }
  };
  
  // Remove a sale item
  const removeItem = (itemId: string) => {
    setSaleItems(saleItems.filter(item => item.id !== itemId));
  };
  
  // Submit the sale
  const submitSale = async () => {
    if (!selectedPatient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un cliente para la venta",
      });
      return;
    }
    
    if (saleItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor agregue al menos un producto a la venta",
      });
      return;
    }
    
    // Validate the payment data
    if (!paymentMethods.find(m => m.id === selectedPaymentMethodId)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un método de pago",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get current patient or recover from sessionStorage if needed
      let currentPatient = selectedPatient;
      
      const netSubtotal = saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = saleItems.reduce((sum, item) => sum + item.discount, 0);
      
      // Calculate tax - assuming it's 19% of (subtotal - discount)
      const calculatedTax = Math.round((netSubtotal - totalDiscount) * 0.19 * 100) / 100;
      
      // Calculate total
      const calculatedTotal = netSubtotal - totalDiscount + calculatedTax;
      
      // Create items array for the API
      const items = saleItems.map(item => ({
        lens_id: item.lens.id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        total: item.total,
      }));
      
      // Create payment data object
      const paymentData = {
        payment_method_id: selectedPaymentMethodId,
        amount: isPartialPayment ? parseFloat(paymentAmount) : calculatedTotal,
        reference_number: paymentReference,
        payment_date: salesDate,
        notes: customerNote,
      };
      
      // Remove appointment ID reference since receptionists can't access prescription info
      const appointmentId = null;
      
      // Prepare discount details
      const discountDetails = saleItems
        .filter(item => item.discount > 0)
        .map(item => ({
          lens_id: item.lens.id,
          original_price: item.price,
          discount_amount: item.discount,
          discount_percentage: Math.round((item.discount / (item.price * item.quantity)) * 100),
        }));
      
      // Check if sale contains lenses for automatic laboratory order creation
      const containsLenses = items.some(item => item.lens_id);
      const lensItems = items.filter(item => item.lens_id).map(item => ({
        lens_id: item.lens_id,
        quantity: item.quantity,
        price: item.price
      }));

      const saleData = {
        patient_id: Number(currentPatient.id), // Ensure it's a number
        order_id: null, // No associated order in this simplified version
        appointment_id: appointmentId, // Include appointment ID if available
        subtotal: netSubtotal,
        tax: calculatedTax,
        discount: totalDiscount,
        total: calculatedTotal,
        notes: customerNote,
        payments: [paymentData],
        is_partial_payment: isPartialPayment,
        items: items,
        
        // Add lens detection fields for automatic laboratory order creation
        contains_lenses: containsLenses,
        lens_items: lensItems
      };
      
      // Log the sale data for debugging
      console.log('=== DEBUGGING SALE SUBMISSION ===');
      console.log('Selected patient object:', selectedPatient);
      console.log('Patient ID value:', selectedPatient?.id);
      console.log('Patient ID type:', typeof selectedPatient?.id);
      console.log('Is selectedPatient null?', selectedPatient === null);
      console.log('Is selectedPatient undefined?', selectedPatient === undefined);
      console.log('Datos de venta a enviar:', saleData);
      
      if (!currentPatient) {
        console.error('selectedPatient is null or undefined, trying to recover from sessionStorage');
        
        // Try to recover patient data from sessionStorage
        const storedSaleData = sessionStorage.getItem('pendingSale');
        if (storedSaleData) {
          try {
            const parsedData = JSON.parse(storedSaleData);
            if (parsedData.patientId && parsedData.patientName) {
              console.log('Attempting to recover patient from sessionStorage:', parsedData);
              currentPatient = {
                id: Number(parsedData.patientId),
                first_name: parsedData.patientName?.split(' ')[0] || '',
                last_name: parsedData.patientName?.split(' ').slice(1).join(' ') || '',
                identification: '',
                email: '',
                phone: ''
              };
              setSelectedPatient(currentPatient);
              console.log('Patient recovered successfully, continuing with sale');
            } else {
              throw new Error('No patient data in sessionStorage');
            }
          } catch (error) {
            console.error('Failed to recover patient from sessionStorage:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "No hay paciente seleccionado. Por favor regrese e inicie la venta nuevamente desde la cita.",
            });
            return;
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No hay paciente seleccionado. Por favor regrese e inicie la venta nuevamente desde la cita.",
          });
          return;
        }
      }
      
      const patientId = Number(currentPatient.id);
      console.log('Patient ID after Number conversion:', patientId);
      
      if (!currentPatient.id || currentPatient.id === undefined || currentPatient.id === null || isNaN(patientId) || patientId <= 0) {
        console.error('Patient ID validation failed:', {
          id: currentPatient.id,
          type: typeof currentPatient.id,
          numberValue: patientId,
          isNaN: isNaN(patientId)
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "ID de paciente inválido. Esto parece ser un error del sistema. Por favor regrese e inicie la venta nuevamente.",
        });
        return;
      }
      
      // Submit the sale using the service
      console.log('Calling saleService.createSale with data:', saleData);
      const result = await saleService.createSale(saleData);
      console.log('Sale service response:', result);
      
      // Handle the response structure - it might be wrapped in a 'data' property
      let saleResult: SaleApiResponse;
      if (result && typeof result === 'object' && 'data' in result) {
        saleResult = (result as { data: SaleApiResponse }).data;
        console.log('Extracted sale result from data wrapper:', saleResult);
      } else {
        saleResult = result as unknown as SaleApiResponse;
      }
      
      // Check if we have a valid sale result
      if (!saleResult || !saleResult.id) {
        console.error('Invalid sale result structure:', saleResult);
        throw new Error('Invalid response structure from server');
      }
      
      // Check if laboratory orders were automatically created
      const hasLaboratoryOrders = saleResult.laboratoryOrders && saleResult.laboratoryOrders.length > 0;
      
      let toastDescription = `Venta ${saleResult.sale_number || 'nueva'} creada exitosamente.`;
      if (hasLaboratoryOrders) {
        const labOrderCount = saleResult.laboratoryOrders.length;
        toastDescription += ` Se ${labOrderCount === 1 ? 'ha creado' : 'han creado'} ${labOrderCount} orden${labOrderCount === 1 ? '' : 'es'} de laboratorio automáticamente.`;
      }
      
      toast({
        title: 'Venta completada',
        description: toastDescription,
        duration: hasLaboratoryOrders ? 8000 : 5000,
      });
      
      // Download invoice
      if (saleResult.guest_pdf_url) {
        window.open(saleResult.guest_pdf_url, '_blank');
      } else if (saleResult.pdf_url) {
        window.open(saleResult.pdf_url, '_blank');
      }
      
      // Clear the pending sale data from sessionStorage since the sale was successful
      sessionStorage.removeItem('pendingSale');
      
      // Navigate back to sales list
      navigate('/receptionist/dashboard');
      
    } catch (error) {
      console.error('Error creating sale:', error);
      
      // Try to extract meaningful error message from the error response
      let errorMessage = 'No se pudo completar la venta. Intente nuevamente.';
      
      if (error && typeof error === 'object') {
        // Check if it's an API error with response data
        if ('response' in error && error.response) {
          const response = error.response as { data?: { message?: string; errors?: Record<string, string[]> } };
          
          if (response.data?.message) {
            errorMessage = response.data.message;
          } else if (response.data?.errors) {
            // Handle validation errors
            const errors = Object.values(response.data.errors).flat();
            errorMessage = errors.join(', ');
          }
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a function to create a discount directly without using the modal
  const applyDirectDiscount = () => {
    // Get the percentage value from a prompt
    const percentStr = prompt('Ingrese el porcentaje de descuento (1-100):');
    if (!percentStr) return;
    
    const percent = parseFloat(percentStr);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor ingrese un porcentaje válido entre 0 y 100',
      });
      return;
    }

    // Calculate the discount
    const grossAmount = price * quantity;
    const discountAmount = (grossAmount * percent) / 100;
    
    // Set the discount
    setDiscount(discountAmount);
    
    // Show confirmation
    toast({
      title: 'Descuento aplicado',
      description: `Se ha aplicado un descuento directo del ${percent}% (${discountAmount.toFixed(2)})`
    });
  };

  // Modificar useEffect para aplicar descuentos automáticamente cuando se detecte un lente con descuentos
  // Añadir un nuevo useEffect que observe cambios en saleItems para aplicar descuentos automáticamente
  useEffect(() => {
    // Solo proceder si hay items en el carrito y un paciente seleccionado
    if (saleItems.length > 0 && selectedPatient) {
      // Buscar items que tengan has_discounts=true pero discount=0 (sin descuento aplicado aún)
      const itemsWithoutDiscount = saleItems.filter(item => 
        item.has_discounts === true && item.discount === 0
      );
      
      // Si hay algún item que cumple la condición, aplicar descuento automáticamente
      if (itemsWithoutDiscount.length > 0) {
        // Usar un pequeño retraso para asegurar que la UI se haya actualizado
        setTimeout(() => {
          console.log('Aplicando descuentos automáticamente a items pendientes');
          // Aplicar descuento al primer item pendiente
          applyBestDiscountAutomatically(itemsWithoutDiscount[0]);
        }, 300);
      }
    }
  }, [saleItems, selectedPatient]);

  // Debug useEffect to track selectedPatient changes
  useEffect(() => {
    console.log('selectedPatient state changed:', selectedPatient);
  }, [selectedPatient]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <CardTitle>Nueva Venta</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/receptionist/dashboard')}
              className="border-blue-200 hover:border-blue-300 hover:bg-blue-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x">
            {/* Left column (3/5): Client info and Products */}
            <div className="lg:col-span-3 p-6 space-y-6">
              {/* Client Section */}
              <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 border-b border-blue-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" /> 
                      Cliente
                    </h3>
                    <Dialog open={showPatientSearch} onOpenChange={setShowPatientSearch}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-blue-200 hover:bg-blue-50">
                          <Search className="h-4 w-4 mr-2 text-blue-600" />
                          Buscar Cliente
                        </Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby="patient-search-description">
                        <DialogHeader>
                          <DialogTitle>Buscar Cliente</DialogTitle>
                          <DialogDescription id="patient-search-description">
                            Ingrese nombre o identificación del cliente
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex w-full items-center space-x-2 my-4">
                          <Input
                            placeholder="Nombre o identificación"
                            value={patientSearchTerm}
                            onChange={(e) => setPatientSearchTerm(e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={searchPatients}>Buscar</Button>
                        </div>
                        {isLoading ? (
                          <div className="text-center py-4">Cargando...</div>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto">
                            {patients.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Identificación</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {patients.map((patient) => (
                                    <TableRow key={patient.id}>
                                      <TableCell>{patient.first_name} {patient.last_name}</TableCell>
                                      <TableCell>{patient.identification}</TableCell>
                                      <TableCell>
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          onClick={() => selectPatient(patient)}
                                        >
                                          Seleccionar
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-4">No se encontraron pacientes</div>
                            )}
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowPatientSearch(false)}>Cancelar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <div className="p-4">
                  {selectedPatient ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Nombre</Label>
                          <div className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Identificación</Label>
                          <div className="font-medium">{selectedPatient.identification}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500">Teléfono</Label>
                          <div>{selectedPatient.phone}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Email</Label>
                          <div>{selectedPatient.email}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is-company"
                            checked={isCompanySale}
                            onChange={(e) => setIsCompanySale(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor="is-company" className="text-sm cursor-pointer">La venta es para una empresa</Label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <User className="h-10 w-10 stroke-1 opacity-40" />
                      <p>No se ha seleccionado un cliente</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPatientSearch(true)}
                        className="mt-2"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Cliente
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Document Info */}
              <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 border-b border-blue-100">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" /> 
                    Información del Documento
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="document-number" className="text-xs text-slate-500">Documento</Label>
                      <Input
                        id="document-number"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        readOnly
                        className="font-mono text-sm bg-slate-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sale-date" className="text-xs text-slate-500">Fecha</Label>
                      <Input
                        id="sale-date"
                        type="date"
                        value={salesDate}
                        onChange={(e) => setSalesDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Product Entry */}
              <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 border-b border-blue-100">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" /> 
                    Agregar Productos
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="product-type" className="text-xs text-slate-500 mb-1 block">Tipo producto</Label>
                      <Select 
                        value={productType}
                        onValueChange={setProductType}
                      >
                        <SelectTrigger id="product-type" className="bg-white">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="glasses">Lentes oftálmicos</SelectItem>
                          <SelectItem value="sunglasses">Gafas de sol</SelectItem>
                          <SelectItem value="contact_lenses">Lentes de contacto</SelectItem>
                          <SelectItem value="accessories">Accesorios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <Label htmlFor="product-desc" className="text-xs text-slate-500 mb-1 block">Descripción</Label>
                        <Input
                          id="product-desc"
                          value={productDescription}
                          onChange={(e) => setProductDescription(e.target.value)}
                          placeholder="Descripción del producto"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="product-code" className="text-xs text-slate-500 mb-1 block">Código</Label>
                        <Input
                          id="product-code"
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value)}
                          placeholder="Código"
                          className="bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="quantity" className="text-xs text-slate-500 mb-1 block">Cantidad</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price" className="text-xs text-slate-500 mb-1 block">Valor</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                          className="bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <Label htmlFor="discount" className="text-xs text-slate-500 mb-1 block">Descuento <Badge className="ml-1 text-xs bg-blue-100 text-blue-700 px-1">Auto</Badge></Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white"
                          />
                          <div className="flex flex-wrap gap-1 justify-end">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => fetchAvailableDiscounts()}
                              type="button"
                              title="Ver descuentos disponibles"
                              className="h-9 px-2 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
                            >
                              Ver
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={openDiscountModal}
                              type="button"
                              title="Solicitar nuevo descuento"
                              className="h-9 w-9 px-0 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
                            >
                              %
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={applyDirectDiscount}
                              type="button"
                              title="Aplicar descuento directo"
                              className="h-9 px-2 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs md:text-sm"
                            >
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-2 bg-gradient-to-r from-slate-50 to-blue-50 p-3 rounded-md border border-blue-100">
                      <div>
                        <Label className="text-xs text-slate-500">Valor bruto</Label>
                        <div className="mt-1 font-medium text-base">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(itemAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Label className="text-xs text-slate-500">Valor neto</Label>
                        <div className="mt-1 font-medium text-base text-blue-600">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(itemAmount - discount)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={addProductToSale} 
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column (2/5): Product list and payment info */}
            <div className="lg:col-span-2 p-6 bg-gradient-to-b from-slate-50 to-white">
              <div className="space-y-6">
                {/* Products Table */}
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                    <ShoppingBag className="h-4 w-4 text-blue-600" /> 
                    Resumen de Compra
                  </h3>
                  
                  {isSummaryLoading ? (
                    <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden p-8">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-10 w-10 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
                        <p className="text-sm text-blue-600 font-medium">{MESSAGES.loading.calculating}</p>
                      </div>
                    </div>
                  ) : saleItems.length > 0 ? (
                    <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-medium">Descripción</TableHead>
                              <TableHead className="font-medium text-right">Precio</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {saleItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-xs text-slate-500">
                                    {item.quantity} x {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.price)}
                                  </div>
                                  {item.discount > 0 && (
                                    <div className="text-xs flex items-center gap-1 font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white px-1.5 py-0.5 rounded-md shadow-sm inline-flex">
                                      <PercentIcon className="h-3 w-3" />
                                      <span>Descuento: -{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.discount)}</span>
                                    </div>
                                  )}
                                  {item.has_discounts && item.discount === 0 && selectedPatient && (
                                    <div className="text-xs flex items-center gap-1 font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md shadow-sm inline-flex">
                                      <div className="h-3 w-3 border-2 border-t-blue-700 border-blue-300 rounded-full animate-spin mr-1"></div>
                                      <span>Aplicando descuento...</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.total)}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => removeItem(item.id)}
                                    className="h-8 w-8"
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Subtotal */}
                      <div className="border-t border-blue-100 p-4 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Descuento total:</span>
                          <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(saleItems.reduce((acc, item) => acc + item.discount, 0))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">IVA (19%):</span>
                          <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tax)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-base">
                          <span>Total:</span>
                          <span className="text-blue-600">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <ShoppingBag className="h-12 w-12 stroke-1 opacity-40" />
                        <p className="text-sm">{MESSAGES.labels.noProducts}</p>
                        <p className="text-xs">{MESSAGES.labels.addProducts}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Payment Section */}
                <div className="rounded-lg border border-blue-100 shadow-sm bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 border-b border-blue-100">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" /> 
                      Forma de pago
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="partial-payment" className="text-xs text-slate-500 mb-1 block">Realizar un abono (pago parcial)</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="partial-payment" 
                          checked={isPartialPayment}
                          onCheckedChange={(checked) => {
                            setIsPartialPayment(checked as boolean);
                            // Reset payment amount when toggling
                            if (!checked) setPaymentAmount('');
                          }}
                        />
                      </div>
                    </div>
                    
                    {isPartialPayment && (
                      <div className="space-y-2">
                        <Label htmlFor="payment-amount" className="text-xs text-slate-500">Monto a abonar</Label>
                        <Input 
                          id="payment-amount"
                          type="number" 
                          placeholder="Monto del abono"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="payment-method" className="text-xs text-slate-500">Método de Pago</Label>
                      <Select 
                        value={selectedPaymentMethodId.toString()} 
                        onValueChange={(value) => setSelectedPaymentMethodId(parseInt(value))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccionar método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.id.toString()}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentMethods.find(m => m.id === selectedPaymentMethodId)?.requires_reference && (
                      <div className="space-y-2">
                        <Label htmlFor="payment-reference" className="text-xs text-slate-500">Referencia</Label>
                        <Input 
                          id="payment-reference"
                          placeholder="Número de referencia" 
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="sale-notes" className="text-xs text-slate-500 mb-1 block">Observaciones</Label>
                      <Textarea
                        id="sale-notes"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Observaciones de la venta"
                        className="resize-none bg-white"
                        rows={3}
                      />
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-md border border-blue-100 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">Saldo por pagar:</span>
                        <span className="font-bold text-lg text-blue-600">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={submitSale}
                    disabled={isLoading || saleItems.length === 0 || !selectedPatient}
                    className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>Procesando...</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Completar Venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Request Modal */}
      <DiscountRequestModal
        lens={selectedLens}
        patient={selectedPatient}
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onSuccess={handleDiscountSuccess}
      />

      {/* Discount Selection Dialog */}
      <Dialog open={isDiscountSelectionOpen} onOpenChange={setIsDiscountSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Descuentos Disponibles</DialogTitle>
            <DialogDescription>
              El mejor descuento ha sido aplicado automáticamente.
              Puede seleccionar otro descuento si lo desea.
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
                {availableDiscounts.map((discount) => (
                  <tr key={discount.id} className={selectedDiscount?.id === discount.id ? 'bg-blue-50' : ''}>
                    <td className="px-2 py-2 text-sm">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                        {discount.discount_percentage}%
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      {discount.is_global ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Global
                        </Badge>
                      ) : discount.patient ? (
                        `${discount.patient.first_name} ${discount.patient.last_name}`
                      ) : 'Desconocido'}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="line-through text-xs text-gray-400">${parseFloat(String(discount.original_price)).toFixed(2)}</span>
                        <span className="font-medium text-green-600">${parseFloat(String(discount.discounted_price)).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => applyDiscount(discount)}
                        className="h-8"
                      >
                        {selectedDiscount?.id === discount.id ? 'Aplicado' : 'Aplicar'}
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

      {/* Modal informativo de descuento aplicado */}
      <Dialog open={isDiscountInfoModalOpen} onOpenChange={setIsDiscountInfoModalOpen}>
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
          
          <div className="py-4">
            {appliedDiscountInfo && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {appliedDiscountInfo.percentage}%
                  </div>
                  <div className="text-sm text-green-700">
                    de descuento
                  </div>
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
            <Button onClick={() => setIsDiscountInfoModalOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSale; 