import type {
  CustomerAttention,
  Operations,
  QuickAttentionItem,
  RecepcionesDinero,
} from '@/services/dailyActivityReportService';
import { QUICK_ATTENTION_ITEMS, RECEPCIONES_DINERO_META } from '@/services/dailyActivityReportService';
import { formatCOP } from '@/lib/formatMoney';

function triple(ca: CustomerAttention, men: keyof CustomerAttention, women: keyof CustomerAttention, ch: keyof CustomerAttention) {
  const m = Number(ca[men]) || 0;
  const w = Number(ca[women]) || 0;
  const c = Number(ca[ch]) || 0;
  return `H ${m} · M ${w} · N ${c}`;
}

export function quickAttentionItemDisplay(
  item: QuickAttentionItem,
  ca: CustomerAttention,
  op: Operations,
  rec: RecepcionesDinero,
): string {
  switch (item) {
    case 'preguntas':
      return triple(ca, 'questions_men', 'questions_women', 'questions_children');
    case 'cotizaciones':
      return triple(ca, 'quotes_men', 'quotes_women', 'quotes_children');
    case 'consultas_efectivas':
      return triple(ca, 'effective_consultations_men', 'effective_consultations_women', 'effective_consultations_children');
    case 'consulta_venta_formula': {
      const t =
        (Number(ca.formula_sale_consultations_men) || 0) +
        (Number(ca.formula_sale_consultations_women) || 0) +
        (Number(ca.formula_sale_consultations_children) || 0);
      return String(t);
    }
    case 'consultas_no_efectivas': {
      const t =
        (Number(ca.non_effective_consultations_men) || 0) +
        (Number(ca.non_effective_consultations_women) || 0) +
        (Number(ca.non_effective_consultations_children) || 0);
      return String(t);
    }
    case 'bonos_entregados':
      return String(op.bonos_entregados ?? 0);
    case 'bonos_redimidos':
      return String(op.bonos_redimidos ?? 0);
    case 'sistecreditos_realizados':
      return String(op.sistecreditos_realizados ?? 0);
    case 'addi_realizados':
      return String(op.addi_realizados ?? 0);
    default: {
      const meta = RECEPCIONES_DINERO_META.find((x) => x.key === item);
      if (meta) return formatCOP(Number(rec[meta.key]) || 0);
      return '—';
    }
  }
}
