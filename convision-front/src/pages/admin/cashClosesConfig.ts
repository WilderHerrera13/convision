import type { CashClose } from '@/services/cashRegisterCloseService';

export type CashCloseRow = CashClose & {
  user?: { id: number; name: string; last_name: string };
};

export { formatCOP } from '@/lib/formatMoney';

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Borrador',
    className: 'rounded-full border-[#7d7d87] bg-[#f5f5f7] text-[#7d7d87]',
  },
  submitted: {
    label: 'Enviado',
    className: 'rounded-full border-[#b57218] bg-[#fff6e3] text-[#b57218]',
  },
  approved: {
    label: 'Aprobado',
    className: 'rounded-full border-[#228b52] bg-[#ebf5ef] text-[#228b52]',
  },
};
