import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  ArrowUpDown,
  Truck,
  Loader,
  Package
} from 'lucide-react';
import { laboratoryOrderService, LaboratoryOrder, LaboratoryOrderFilterParams, LaboratoryOrderStats } from '@/services/laboratoryOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { Laboratory } from '@/services/laboratoryService';
import { laboratoryService } from '@/services/laboratoryService';
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';
import { useDebounce } from '@/hooks/useDebounce.ts';
import { CellContext } from '@tanstack/react-table';

interface BadgeVariantProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info';
}

// Map status to badge colors
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, BadgeVariantProps['variant']> = {
    'pending': 'warning',
    'in_process': 'info',
    'sent_to_lab': 'secondary',
    'ready_for_delivery': 'success',
    'delivered': 'success',
    'cancelled': 'destructive',
  };
  
  return statusMap[status] || 'default';
};

// Map status to human readable text
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente',
    'in_process': 'En proceso',
    'sent_to_lab': 'Enviado a laboratorio',
    'ready_for_delivery': 'Listo para entregar',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado',
  };
  
  return statusMap[status] || status;
};

// Map priority to badge colors
const getPriorityBadge = (priority: string) => {
  const priorityMap: Record<string, BadgeVariantProps['variant']> = {
    'low': 'outline',
    'normal': 'default',
    'high': 'warning',
    'urgent': 'destructive',
  };
  
  return priorityMap[priority] || 'default';
};

// Map priority to human readable text
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    'low': 'Baja',
    'normal': 'Normal',
    'high': 'Alta',
    'urgent': 'Urgente',
  };
  
  return priorityMap[priority] || priority;
};

const LaboratoryOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [laboratoryOrders, setLaboratoryOrders] = useState<LaboratoryOrder[]>([]);
  const [stats, setStats] = useState<LaboratoryOrderStats | null>(null);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [currentLaboratoryOrder, setCurrentLaboratoryOrder] = useState<LaboratoryOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  
  // Filters
  const [filters, setFilters] = useState<LaboratoryOrderFilterParams>({
    status: '',
    laboratory_id: undefined,
    patient_id: undefined,
    priority: '',
    search: '',
    page: 1,
    per_page: 10,
    sort_field: 'created_at',
    sort_direction: 'desc'
  });

  // Debounce the filters to prevent too many API calls
  const debouncedFilters = useDebounce(filters, 500);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [ordersResponse, statsData, labsResponse] = await Promise.all([
          laboratoryOrderService.getLaboratoryOrders({
            ...filters,
            page: currentPage,
            per_page: perPage
          }),
          laboratoryOrderService.getLaboratoryOrderStats(),
          laboratoryService.getLaboratories()
        ]);

        setLaboratoryOrders(ordersResponse.data);
        setCurrentPage(ordersResponse.current_page);
        setTotalPages(ordersResponse.last_page);
        setStats(statsData);
        setLaboratories(labsResponse.data);
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos iniciales.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Only run on mount

  // Handle filter changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          ...debouncedFilters,
          page: currentPage,
          per_page: perPage
        };
        
        const [ordersResponse, statsData] = await Promise.all([
          laboratoryOrderService.getLaboratoryOrders(params),
          laboratoryOrderService.getLaboratoryOrderStats()
        ]);

        // Debug: Log what we received from the API
        console.log('Laboratory orders API response:', ordersResponse);
        console.log('Laboratory orders data:', ordersResponse.data);
        
        // Update state with the data received
        setLaboratoryOrders(ordersResponse.data || []);
        setCurrentPage(ordersResponse.current_page || 1);
        setTotalPages(ordersResponse.last_page || 1);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedFilters, currentPage, perPage]);

  const handleSearch = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search
    }));
  };

  const handleFilterChange = (field: keyof LaboratoryOrderFilterParams, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === 'all' ? '' : value
    }));
  };

  const handleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sort_field: field as keyof LaboratoryOrderFilterParams,
      sort_direction: prev.sort_field === field ? (prev.sort_direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  };

  const handleStatusUpdate = async () => {
    if (!currentLaboratoryOrder || !newStatus) {
      return;
    }
    
    try {
      await laboratoryOrderService.updateLaboratoryOrderStatus(currentLaboratoryOrder.id, {
        status: newStatus,
        notes: statusNotes
      });
      
      toast({
        title: 'Estado actualizado',
        description: 'El estado de la orden de laboratorio ha sido actualizado con éxito.',
        variant: 'default'
      });
      
      // Reset and close modal
      setCurrentLaboratoryOrder(null);
      setNewStatus('');
      setStatusNotes('');
      setStatusModalOpen(false);
      
      // Refresh data by triggering a filter update
      setFilters(prev => ({ ...prev }));
      
    } catch (error) {
      console.error('Error updating laboratory order status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la orden de laboratorio.',
        variant: 'destructive'
      });
    }
  };

  const openStatusModal = (laboratoryOrder: LaboratoryOrder) => {
    setCurrentLaboratoryOrder(laboratoryOrder);
    setNewStatus(laboratoryOrder.status);
    setStatusNotes('');
    setStatusModalOpen(true);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      laboratory_id: undefined,
      patient_id: undefined,
      priority: '',
      search: '',
      page: 1,
      per_page: perPage,
      sort_field: 'created_at',
      sort_direction: 'desc'
    });
  };

  const handleRowClick = (row: LaboratoryOrder) => {
    navigate(`/admin/laboratory-orders/${row.id}`);
  };

  // Debug output
  useEffect(() => {
    console.log('Debug - Rendering with data:', { 
      laboratoryOrders, 
      loading, 
      empty: !laboratoryOrders || laboratoryOrders.length === 0,
      totalItems: laboratoryOrders?.length
    });
  }, [laboratoryOrders, loading]);

  // Add extra debug logging for raw API response
  useEffect(() => {
    const checkApiResponse = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        const response = await fetch('http://localhost:8000/api/v1/laboratory-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        console.log('Debug - Direct API fetch result:', data);
        console.log('Debug - Nested data objects:', {
          laboratoryName: data.data[0]?.laboratory?.name,
          patientName: data.data[0]?.patient ? `${data.data[0].patient.first_name} ${data.data[0].patient.last_name}` : null,
          status: data.data[0]?.status,
          priority: data.data[0]?.priority
        });
      } catch (error) {
        console.error('Debug - Error fetching directly:', error);
      }
    };
    
    checkApiResponse();
  }, []);

  // More detailed debug of laboratoryOrders
  useEffect(() => {
    if (laboratoryOrders && laboratoryOrders.length > 0) {
      console.log('Debug - First laboratory order complete object:', laboratoryOrders[0]);
      console.log('Debug - Laboratory object:', laboratoryOrders[0]?.laboratory);
      console.log('Debug - Patient object:', laboratoryOrders[0]?.patient);
    }
  }, [laboratoryOrders]);

  // Define columns for the DataTable
  const columns: DataTableColumnDef<LaboratoryOrder>[] = [
    {
      id: "order_number",
      header: "# Orden",
      type: "text" as const,
      accessorKey: "order_number",
    },
    {
      id: "laboratory",
      header: "Laboratorio",
      type: "text" as const,
      // @ts-ignore - Using any for compatibility with DataTable component
      cell: (info: any) => {
        // Extract row data from the info object passed by DataTable
        const row = info.row?.original;
        // More robust handling of nested data
        const labName = row?.laboratory?.name;
        console.log('Debug - Laboratory cell rendering:', { 
          rowObject: row, 
          laboratoryObject: row?.laboratory,
          labName
        });
        return labName || '-';
      }
    },
    {
      id: "patient",
      header: "Paciente",
      type: "text" as const,
      // @ts-ignore - Using any for compatibility with DataTable component
      cell: (info: any) => {
        // Extract row data from the info object passed by DataTable
        const row = info.row?.original;
        // More robust handling of nested data
        const patientName = row?.patient ? `${row.patient.first_name} ${row.patient.last_name}` : null;
        console.log('Debug - Patient cell rendering:', { 
          rowObject: row, 
          patientObject: row?.patient,
          patientName
        });
        return patientName || '-';
      }
    },
    {
      id: "status",
      header: "Estado",
      type: "status" as const,
      accessorKey: "status",
      // @ts-ignore - Using any for compatibility with DataTable component
      cell: (info: any) => {
        const row = info.row?.original;
        console.log('Debug - Status cell rendering:', { status: row?.status });
        return (
          <Badge variant={getStatusBadge(row?.status)}>
            {getStatusText(row?.status)}
          </Badge>
        );
      }
    },
    {
      id: "priority",
      header: "Prioridad",
      type: "status" as const,
      accessorKey: "priority",
      // @ts-ignore - Using any for compatibility with DataTable component
      cell: (info: any) => {
        const row = info.row?.original;
        console.log('Debug - Priority cell rendering:', { priority: row?.priority });
        return (
          <Badge variant={getPriorityBadge(row?.priority)}>
            {getPriorityText(row?.priority)}
          </Badge>
        );
      }
    },
    {
      id: "created_at",
      header: "Fecha",
      type: "date" as const,
      accessorKey: "created_at",
      // @ts-expect-error - Using any for compatibility with DataTable component
      cell: (info: any) => {
        const row = info.row?.original;
        console.log('Debug - Date cell rendering:', { created_at: row?.created_at });
        return row?.created_at ? formatDate(row.created_at) : '—';
      }
    },
    {
      id: "actions",
      header: "Acciones",
      type: "actions" as const,
      // @ts-expect-error - Using any for compatibility with DataTable component
      cell: (info: any) => {
        const row = info.row?.original;
        console.log('Debug - Actions cell rendering:', { 
          rowObject: row, 
          rowId: row?.id
        });
        
        return (
          <div className="flex space-x-2 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                if (row?.id) {
                  navigate(`/admin/laboratory-orders/${row.id}`);
                } else {
                  console.error('Cannot navigate: missing row ID');
                }
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                if (row) {
                  openStatusModal(row);
                } else {
                  console.error('Cannot open status modal: missing row data');
                }
              }}
            >
              <Package className="h-4 w-4 mr-1" />
              Estado
            </Button>
            {row?.pdf_token && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row?.id && row?.pdf_token) {
                    window.open(
                      laboratoryOrderService.getLaboratoryOrderPdfUrl(row.id, row.pdf_token), 
                      '_blank'
                    );
                  } else {
                    console.error('Cannot open PDF: missing ID or token');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  // Add additional debugging for columns and data matching
  useEffect(() => {
    if (laboratoryOrders && laboratoryOrders.length > 0) {
      console.log('First laboratory order:', laboratoryOrders[0]);
      console.log('Columns accessors:', columns.map(col => ({ 
        id: col.id, 
        accessorKey: col.accessorKey 
      })));
    }
  }, [laboratoryOrders]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Órdenes de Laboratorio</h2>
        <Button onClick={() => navigate('/admin/laboratory-orders/new')}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Orden
        </Button>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.in_process + stats.sent_to_lab}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Listos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ready_for_delivery}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Laboratory Orders Table */}
      <Card>
        <CardContent className="p-0">
          {/* Add custom styles through regular CSS classes */}
          <DataTable
            columns={columns}
            data={laboratoryOrders || []}
            loading={loading}
            enablePagination={true}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            enableSearch={true}
            onSearch={handleSearch}
            searchPlaceholder="Buscar orden..."
            onRowClick={handleRowClick}
            title="Órdenes de Laboratorio"
            addNewButton={{
              label: "Nueva Orden",
              onClick: () => navigate('/admin/laboratory-orders/new')
            }}
            emptyMessage="No se encontraron órdenes de laboratorio con los filtros aplicados."
            filters={
              <div className="flex flex-wrap gap-2">
                <div className="w-40">
                  <Select 
                    value={filters.status || ''}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_process">En proceso</SelectItem>
                      <SelectItem value="sent_to_lab">Enviado a laboratorio</SelectItem>
                      <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
                      <SelectItem value="delivered">Entregado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select 
                    value={filters.laboratory_id?.toString() || ''}
                    onValueChange={(value) => handleFilterChange('laboratory_id', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Laboratorio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los laboratorios</SelectItem>
                      {laboratories.map(lab => (
                        <SelectItem key={lab.id} value={lab.id.toString()}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Select 
                    value={filters.priority || ''}
                    onValueChange={(value) => handleFilterChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(filters.status || filters.laboratory_id || filters.priority) && (
                  <Button variant="outline" onClick={clearFilters} className="whitespace-nowrap">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>
      
      {/* Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado</DialogTitle>
            <DialogDescription>
              Cambiar el estado de la orden de laboratorio {currentLaboratoryOrder?.order_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Estado</label>
              <Select 
                value={newStatus}
                onValueChange={setNewStatus}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_process">En proceso</SelectItem>
                  <SelectItem value="sent_to_lab">Enviado a laboratorio</SelectItem>
                  <SelectItem value="ready_for_delivery">Listo para entregar</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Notas</label>
              <Input
                className="col-span-3"
                placeholder="Notas de cambio de estado (opcional)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleStatusUpdate}>Actualizar Estado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratoryOrders; 