import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import cashRegisterCloseService from '@/services/cashRegisterCloseService';

const CashCloseDetailRedirector = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    };
    const userId = payload?.user?.id ?? payload?.user_id;
    const closeDate = payload?.close_date;
    if (userId && closeDate) {
      navigate(`/admin/cash-closes/advisor/${userId}?date=${closeDate}`, { replace: true });
    } else {
      navigate('/admin/cash-closes', { replace: true });
    }
  }, [data, navigate]);

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
