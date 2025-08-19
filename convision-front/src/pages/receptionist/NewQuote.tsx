import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
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
  Search,
  Calendar,
  Grid,
  List,
  Eye,
  ShoppingCart
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { patientService } from '@/services/patientService';
import { quoteService } from '@/services/quoteService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import api from '@/lib/axios';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  email?: string;
  phone?: string;
}

interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: string;
  cost: string;
  type_id: number;
  brand_id: number;
  material_id: number;
  type: { id: number; name: string };
  brand: { id: number; name: string };
  material: { id: number; name: string };
}

interface CartItem {
  lens: Lens;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  notes?: string;
}

const TAX_RATE = 0.19; // 19% tax rate

const NewQuote: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Quote details
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [expireDate, setExpireDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  // Product selection modal state
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<Lens[]>([]);
  const [lensSearchQuery, setLensSearchQuery] = useState('');
  const [lensSearchLoading, setLensSearchLoading] = useState(false);
  const [selectedLensesForAdd, setSelectedLensesForAdd] = useState<Lens[]>([]);
  const [lensDisplayMode, setLensDisplayMode] = useState<'grid' | 'list'>('grid');

  // Update calculations when cart changes
  useEffect(() => {
    const calculatedSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
    setSubtotal(calculatedSubtotal);
    
    const calculatedTax = calculatedSubtotal * TAX_RATE;
    setTaxAmount(calculatedTax);
    
    setTotal(calculatedSubtotal + calculatedTax - discount);
  }, [cart, discount]);

  // Search patients directly using the API for better search experience
  const searchPatients = async () => {
    if (!patientSearchQuery.trim() || patientSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      // Search in key fields with logical OR
      const s_f = ['identification', 'first_name', 'last_name', 'email'];
      const s_v = Array(s_f.length).fill(patientSearchQuery);
      const s_o = 'or'; // Use OR for better matches
      
      const response = await api.get('/api/v1/patients', {
        params: {
          per_page: 10,
          s_f: JSON.stringify(s_f),
          s_v: JSON.stringify(s_v),
          s_o,
          sort: 'first_name,asc',
        }
      });
      
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron buscar clientes. Intente nuevamente.'
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (patientSearchQuery.trim().length >= 2) {
        searchPatients();
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  // Handle selecting a patient from search results
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchOpen(false);
  };

  // Navigate to create a new patient
  const handleCreateNewPatient = () => {
    navigate('/receptionist/patients/new?redirect=quotes/new');
  };

  // Navigate to select lenses from catalog
  const handleSelectLenses = () => {
    setProductSelectionOpen(true);
  };

  // Check session storage for a lens selection
  useEffect(() => {
    const storedLens = sessionStorage.getItem('selectedLens');
    if (storedLens) {
      const lensData = JSON.parse(storedLens);
      addToCart(lensData, 1);
      sessionStorage.removeItem('selectedLens');
    }

    // Check for pending quote data (returning from lens selection)
    const pendingQuote = sessionStorage.getItem('pendingQuote');
    if (pendingQuote) {
      const quoteData = JSON.parse(pendingQuote);
      if (quoteData.patientId && !selectedPatient) {
        fetchPatientData(quoteData.patientId);
      }
      if (quoteData.notes) setNotes(quoteData.notes);
      if (quoteData.expireDate) setExpireDate(quoteData.expireDate);
      if (quoteData.discount) setDiscount(quoteData.discount);
      
      // Cart will be updated by the selected lens if one was chosen
    }
  }, []);

  // Fetch complete patient data
  const fetchPatientData = async (patientId: number) => {
    try {
      const patient = await patientService.getPatient(patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  // Add a lens to the cart
  const addToCart = (lens: Lens, quantity: number) => {
    // Check if lens is already in cart
    const existingItemIndex = cart.findIndex(item => item.lens.id === lens.id);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const updatedCart = [...cart];
      const item = updatedCart[existingItemIndex];
      item.quantity += quantity;
      item.total = item.price * item.quantity - item.discount;
      setCart(updatedCart);
    } else {
      // Add new item to cart
      const price = parseFloat(lens.price);
      const newItem: CartItem = {
        lens,
        quantity,
        price,
        discount: 0,
        total: price * quantity
      };
      setCart([...cart, newItem]);
    }
  };

  // Remove item from cart
  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedCart = [...cart];
    const item = updatedCart[index];
    item.quantity = quantity;
    item.total = item.price * quantity - item.discount;
    setCart(updatedCart);
  };

  // Update item discount
  const updateItemDiscount = (index: number, discount: number) => {
    if (discount < 0) return;
    
    const updatedCart = [...cart];
    const item = updatedCart[index];
    item.discount = discount;
    item.total = item.price * item.quantity - discount;
    setCart(updatedCart);
  };

  // Update item notes
  const updateItemNotes = (index: number, notes: string) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    item.notes = notes;
    setCart(updatedCart);
  };

  // Handle updating discount amount
  const handleDiscountChange = (value: string) => {
    const amount = value === '' ? 0 : parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    setDiscount(amount);
  };

  // Handle search input keydown (Enter key)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPatients();
    }
  };

  // Search for lenses
  const searchLenses = async (query: string = lensSearchQuery) => {
    if (query.length < 2) {
      setAvailableLenses([]);
      return;
    }
    
    setLensSearchLoading(true);
    try {
      const s_f = ['description', 'identifier', 'internal_code'];
      const s_v = Array(s_f.length).fill(query);
      const s_o = 'or';
      
      const response = await api.get('/api/v1/products', {
        params: {
          per_page: 20,
          s_f: JSON.stringify(s_f),
          s_v: JSON.stringify(s_v),
          s_o,
          sort: 'description,asc',
        }
      });
      
      setAvailableLenses(response.data.data || []);
    } catch (error) {
      console.error('Error searching lenses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron buscar productos. Intente nuevamente.'
      });
    } finally {
      setLensSearchLoading(false);
    }
  };

  // Debounced lens search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (lensSearchQuery.trim().length >= 2) {
        searchLenses();
      } else {
        setAvailableLenses([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [lensSearchQuery]);

  // Toggle lens selection for adding to cart
  const toggleLensSelection = (lens: Lens) => {
    const isSelected = selectedLensesForAdd.find(l => l.id === lens.id);
    if (isSelected) {
      setSelectedLensesForAdd(selectedLensesForAdd.filter(l => l.id !== lens.id));
    } else {
      setSelectedLensesForAdd([...selectedLensesForAdd, lens]);
    }
  };

  // Add selected lenses to cart
  const addSelectedLensesToCart = () => {
    if (selectedLensesForAdd.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Seleccione al menos un producto para agregar.'
      });
      return;
    }

    selectedLensesForAdd.forEach(lens => {
      addToCart(lens, 1);
    });

    toast({
      title: 'Productos agregados',
      description: `Se agregaron ${selectedLensesForAdd.length} producto(s) a la cotización.`
    });

    // Clear selection and close modal
    setSelectedLensesForAdd([]);
    setProductSelectionOpen(false);
    setLensSearchQuery('');
    setAvailableLenses([]);
  };

  // Submit the quote
  const handleSubmitQuote = async () => {
    // Validate required fields
    if (!selectedPatient) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor seleccione un cliente para la cotización.'
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La cotización debe tener al menos un lente.'
      });
      return;
    }

    // Create quote items
    const items = cart.map(item => ({
      lens_id: item.lens.id,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      total: item.total,
      notes: item.notes
    }));

    // Create quote request
    const quoteData = {
      patient_id: selectedPatient.id,
      subtotal,
      tax: taxAmount,
      discount,
      total,
      notes: notes || null,
      expiration_date: expireDate,
      items
    };

    try {
      // Submit quote
      const response = await quoteService.createQuote(quoteData);
      
      // Clear session storage
      sessionStorage.removeItem('pendingQuote');
      
      // Show success message
      toast({
        title: 'Cotización creada',
        description: `La cotización ${response.quote.quote_number} ha sido creada exitosamente.`
      });
      
      // Download PDF
      if (response.quote.id && response.pdf_token) {
        await quoteService.downloadQuotePdfWithToken(
          response.quote.id, 
          response.quote.quote_number, 
          response.pdf_token
        );
      }
      
      // Navigate to quotes list
      navigate('/receptionist/quotes');
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear la cotización. Intente nuevamente.'
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nueva Cotización</h1>
            <p className="text-gray-500">Crear una cotización para un cliente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5 text-blue-500" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                        <p className="text-gray-500">Identificación: {selectedPatient.identification}</p>
                        {selectedPatient.email && <p className="text-gray-500">Email: {selectedPatient.email}</p>}
                        {selectedPatient.phone && <p className="text-gray-500">Teléfono: {selectedPatient.phone}</p>}
                      </div>
                      <Button variant="outline" onClick={() => setPatientSearchOpen(true)}>
                        Cambiar Cliente
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-500">No hay cliente seleccionado para esta cotización.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setPatientSearchOpen(true)}>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Cliente
                      </Button>
                      <Button variant="outline" onClick={handleCreateNewPatient}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Cliente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lens Selection Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Package className="mr-2 h-5 w-5 text-blue-500" />
                  Lentes Seleccionados
                </CardTitle>
                <CardDescription>
                  Productos incluidos en esta cotización
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">No hay lentes seleccionados todavía.</p>
                    <Button onClick={handleSelectLenses}>
                      <Package className="h-4 w-4 mr-2" />
                      Seleccionar Lentes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-sm text-gray-500">
                            <th className="text-left py-3 font-medium">Producto</th>
                            <th className="text-center py-3 font-medium">Cantidad</th>
                            <th className="text-center py-3 font-medium">Precio</th>
                            <th className="text-center py-3 font-medium">Descuento</th>
                            <th className="text-right py-3 font-medium">Total</th>
                            <th className="text-right py-3 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item, index) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-3">
                                <div>
                                  <p className="font-medium">{item.lens.identifier}</p>
                                  <p className="text-sm text-gray-500">{item.lens.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.lens.brand.name}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {item.lens.type.name}
                                    </Badge>
                                  </div>
                                  <div className="mt-2">
                                    <Input 
                                      placeholder="Notas adicionales" 
                                      value={item.notes || ''}
                                      onChange={(e) => updateItemNotes(index, e.target.value)}
                                      className="text-xs h-7 w-full"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </Button>
                                  <span className="w-8 text-center">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.discount}
                                  onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                                  className="h-7 text-center w-full"
                                />
                              </td>
                              <td className="py-3 text-right font-medium">
                                {formatCurrency(item.total)}
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFromCart(index)}
                                  className="text-red-500 h-7 w-7"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center">
                      <Button onClick={handleSelectLenses}>
                        <Plus className="h-4 w-4 mr-2" />
                        Seleccionar Productos
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-500" />
                  Información Adicional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry-date">Fecha de Vencimiento</Label>
                      <Input
                        id="expiry-date"
                        type="date"
                        value={expireDate}
                        onChange={(e) => setExpireDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas de la Cotización</Label>
                    <Textarea
                      id="notes"
                      placeholder="Agregar notas o comentarios adicionales para esta cotización..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Quote Summary Card */}
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5 text-blue-500" />
                  Resumen de Cotización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary details */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IVA (19%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Descuento:</span>
                    <div className="flex items-center w-24">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="h-7 text-right"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span className="text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Validities */}
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Válido hasta: {format(new Date(expireDate), 'dd/MM/yyyy')}</span>
                  </div>
                  <p className="text-xs">Los precios y disponibilidad de los lentes están sujetos a cambios después de la fecha de vencimiento.</p>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full"
                    onClick={handleSubmitQuote}
                    disabled={!selectedPatient || cart.length === 0}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Crear Cotización
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/receptionist/quotes')}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Client Search Dialog */}
      <Dialog open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
            <DialogDescription>
              Ingrese nombre o identificación del cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nombre o identificación..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1"
                autoFocus
              />
              <Button onClick={searchPatients}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
            
            <ScrollArea className="h-72 rounded border">
              {searchLoading ? (
                <div className="flex justify-center items-center h-full">
                  <p>Buscando...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                      <div className="text-sm text-gray-500">Identificación: {patient.identification}</div>
                      {patient.phone && <div className="text-sm text-gray-500">Teléfono: {patient.phone}</div>}
                    </div>
                  ))}
                </div>
              ) : patientSearchQuery ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500 mb-2">No se encontraron resultados</p>
                  <Button variant="outline" onClick={handleCreateNewPatient}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nuevo Cliente
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Ingrese al menos 2 caracteres para buscar
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Selection Modal */}
      <Dialog open={productSelectionOpen} onOpenChange={setProductSelectionOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Seleccionar Productos
            </DialogTitle>
            <DialogDescription>
              Busque y seleccione múltiples productos para agregar a la cotización
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and View Controls */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar productos por descripción, código..."
                    value={lensSearchQuery}
                    onChange={(e) => setLensSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={lensDisplayMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLensDisplayMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={lensDisplayMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLensDisplayMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected count */}
            {selectedLensesForAdd.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Badge className="bg-blue-600 text-white">
                  {selectedLensesForAdd.length} seleccionado(s)
                </Badge>
                <span className="text-sm text-blue-700">
                  Productos listos para agregar a la cotización
                </span>
              </div>
            )}

            {/* Products Display */}
            <ScrollArea className="h-96">
              {lensSearchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Buscando productos...</p>
                  </div>
                </div>
              ) : availableLenses.length === 0 && lensSearchQuery.length >= 2 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">No se encontraron productos</p>
                  <p className="text-sm text-gray-500">Intente con otros términos de búsqueda</p>
                </div>
              ) : lensSearchQuery.length < 2 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">Buscar productos</p>
                  <p className="text-sm text-gray-500">Escriba al menos 2 caracteres para buscar</p>
                </div>
              ) : (
                <div className={
                  lensDisplayMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                    : "space-y-2"
                }>
                  {availableLenses.map(lens => {
                    const isSelected = selectedLensesForAdd.find(l => l.id === lens.id);
                    
                    if (lensDisplayMode === 'grid') {
                      return (
                        <Card 
                          key={lens.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => toggleLensSelection(lens)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {lens.internal_code}
                              </Badge>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <h4 className="font-medium text-sm line-clamp-2 mb-2">
                              {lens.description}
                            </h4>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div>Marca: {lens.brand?.name || 'N/A'}</div>
                              <div>Precio: {formatCurrency(parseFloat(lens.price))}</div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    } else {
                      return (
                        <div 
                          key={lens.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => toggleLensSelection(lens)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {lens.internal_code}
                              </Badge>
                              <span className="text-sm font-medium">{lens.description}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {lens.brand?.name} • {formatCurrency(parseFloat(lens.price))}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setProductSelectionOpen(false);
                  setSelectedLensesForAdd([]);
                  setLensSearchQuery('');
                  setAvailableLenses([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={addSelectedLensesToCart}
                disabled={selectedLensesForAdd.length === 0}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar {selectedLensesForAdd.length > 0 ? `(${selectedLensesForAdd.length})` : ''} a Cotización
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewQuote; 