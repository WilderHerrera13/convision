import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layouts/PageLayout';
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import {
  LABORATORY_ORDER_STATUS_BADGE_CLASS,
  LABORATORY_ORDER_STATUS_LABELS,
} from '@/constants/laboratoryOrderStatus';
import { useDebounce } from '@/hooks/useDebounce.ts';
import Pagination from '@/components/ui/pagination';

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
  urgent: 'Urgente',
};

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  urgent: 'bg-red-100 text-red-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

const PER_PAGE = 20;

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={`${PRIORITY_BADGE_CLASS[priority] ?? 'bg-gray-100 text-gray-600'} border-0`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = LABORATORY_ORDER_STATUS_BADGE_CLASS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <Badge className={`${cls} border-0`}>
      {LABORATORY_ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Inbox className="size-12 text-convision-text-muted" strokeWidth={1.5} />
      <p className="text-[15px] font-semibold text-convision-text">Sin órdenes pendientes</p>
      <p className="text-[13px] text-convision-text-secondary max-w-xs">
        No hay órdenes de laboratorio en revisión de calidad en este momento
      </p>
    </div>
  );
}

const QualityReview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);
  const actionHandledRef = useRef(false);

  useEffect(() => {
    if (actionHandledRef.current) return;
    const action = searchParams.get('action');
    if (action === 'approved') {
      actionHandledRef.current = true;
      toast({
        title: 'Orden aprobada exitosamente',
        variant: 'default',
        duration: 5000,
      });
      setSearchParams({}, { replace: true });
    } else if (action === 'returned') {
      actionHandledRef.current = true;
      toast({
        title: 'Orden retornada al laboratorio',
        variant: 'default',
        duration: 5000,
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const { data, isLoading } = useQuery({
    queryKey: ['quality-review-orders', page, debouncedSearch, priority],
    queryFn: () =>
      laboratoryOrderService.getLaboratoryOrders({
        status: 'in_quality',
        search: debouncedSearch || undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        per_page: PER_PAGE,
        sort_field: 'created_at',
        sort_direction: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const orders: LaboratoryOrder[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    setPage(1);
  };

  return (
    <PageLayout
      title="Revisión de calidad"
      subtitle="Gestiona las órdenes de laboratorio que requieren revisión de calidad"
    >
      <div className="max-w-[1080px] mx-auto w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-convision-text-muted" />
            <Input
              placeholder="Buscar por paciente o número de orden..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 h-9 text-[13px]"
            />
          </div>
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[200px] h-9 text-[13px]">
              <SelectValue placeholder="Todas las prioridades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden border-convision-border-subtle shadow-none">
          <div className="border-t border-convision-border-subtle">
            <Table>
              <TableHeader>
                <TableRow className="bg-convision-background hover:bg-convision-background">
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold w-[110px]">
                    #
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Paciente
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold">
                    Laboratorio
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold w-[110px]">
                    Prioridad
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold w-[130px]">
                    Estado
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-convision-text-muted font-semibold text-right w-[130px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <LoadingRows />
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const patientName = order.patient
                      ? `${order.patient.first_name} ${order.patient.last_name}`
                      : '—';
                    const labName = order.laboratory?.name ?? '—';
                    return (
                      <TableRow
                        key={order.id}
                        className="h-[52px] hover:bg-convision-background/60 cursor-pointer"
                        onClick={() => navigate(`/specialist/laboratory-orders/${order.id}`)}
                      >
                        <TableCell className="text-[13px] font-semibold text-convision-text">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-[13px] text-convision-text">
                          {patientName}
                        </TableCell>
                        <TableCell className="text-[13px] text-convision-text-secondary">
                          {labName}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={order.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[12px] h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/specialist/laboratory-orders/${order.id}`);
                            }}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && orders.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-convision-border-subtle">
              <span className="text-[12px] text-convision-text-secondary">
                Mostrando{' '}
                <span className="font-semibold text-convision-text">
                  {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)}
                </span>{' '}
                de {total} órdenes
              </span>
              <Pagination
                variant="figma"
                currentPage={page}
                totalPages={lastPage}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
};

export default QualityReview;
