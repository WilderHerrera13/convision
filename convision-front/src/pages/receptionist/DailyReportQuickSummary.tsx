import React from 'react';
import {
  QUICK_ATTENTION_ITEMS,
  type CustomerAttention,
  type Operations,
  type QuickAttentionItem,
  type RecepcionesDinero,
} from '@/services/dailyActivityReportService';
import { quickAttentionItemDisplay } from '@/pages/receptionist/dailyReportQuickSummaryUtils';

type Props = {
  customerAttention: CustomerAttention;
  operations: Operations;
  recepciones: RecepcionesDinero;
};

const DailyReportQuickSummary: React.FC<Props> = ({ customerAttention, operations, recepciones }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e5e5e9] bg-white">
      <div className="border-b border-[#c5d3f8] bg-[#eff1ff] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#3a71f7]">Resumen alineado al registro rápido</p>
        <p className="mt-1 text-[11px] text-[#7d7d87]">
          Mismos ítems que en registro rápido. Los montos en COP aparecen abajo en &quot;Dinero recibido&quot;.
        </p>
      </div>
      <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ATTENTION_ITEMS.map(({ value, label }) => (
          <div
            key={value}
            className="flex flex-col gap-1 rounded-md border border-[#e5e5e9] bg-[#fafafa] px-3 py-2"
          >
            <span className="text-[11px] font-medium text-[#7d7d87]">{label}</span>
            <span className="text-[12px] font-semibold tabular-nums text-[#0f0f12]">
              {quickAttentionItemDisplay(value as QuickAttentionItem, customerAttention, operations, recepciones)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyReportQuickSummary;
