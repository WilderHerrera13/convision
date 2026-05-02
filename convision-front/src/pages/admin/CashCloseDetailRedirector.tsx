import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import cashRegisterCloseService from '@/services/cashRegisterCloseService';

const CashCloseDetailRedirector = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cash-close-redirect', id],
    queryFn: () => cashRegisterCloseService.get(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (!data) return;
    const payload = (data?.data ?? data) as {
      user?: { id?: number };
      user_id?: number;
      close_date?: string;
      branch_id?: number;
    };
    const userId = payload?.user?.id ?? payload?.user_id;
    const closeDate = payload?.close_date;
    const branchFromQuery = searchParams.get('branch_id');
    const branchId =
      branchFromQuery ??
      (payload.branch_id != null && payload.branch_id > 0 ? String(payload.branch_id) : '0');
    if (userId && closeDate) {
      navigate(`/admin/cash-closes/advisor/${userId}?date=${closeDate}&branch_id=${branchId}`, {
        replace: true,
      });
    } else {
      navigate('/admin/cash-closes', { replace: true });
    }
  }, [data, navigate, searchParams]);

  useEffect(() => {
    if (isError) {
      navigate('/admin/cash-closes', { replace: true });
    }
  }, [isError, navigate]);

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Skeleton className="h-[420px] w-full rounded-[12px]" />
      </div>
    );
  }

  return null;
};

export default CashCloseDetailRedirector;
