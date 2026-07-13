interface RelatedDiagnosis {
  code: string;
  desc: string;
}

interface Props {
  primaryCode: string;
  primaryDesc: string;
  diagnosisTypeLabel: string;
  relatedList: RelatedDiagnosis[];
}

export function DiagnosisSummaryPanel({ primaryCode, primaryDesc, diagnosisTypeLabel, relatedList }: Props) {
  if (!primaryCode && relatedList.length === 0) return null;

  return (
    <div className="mt-3 border border-[#0f8f64] bg-[#e5f6ef] rounded-[8px] p-3">
      <p className="text-[12px] font-semibold text-[#0f8f64] mb-2">Diagnósticos</p>
      <div className="flex flex-wrap gap-2">
        {primaryCode && (
          <div className="border-[1.5px] border-[#0f8f64] rounded-[6px] px-3 py-2 flex items-start gap-2 bg-[#e5f6ef] min-w-0">
            <span className="bg-[#0f8f64] text-white text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0">{primaryCode}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#121215]">{primaryDesc}</p>
              <div className="flex gap-1 mt-0.5">
                <span className="bg-[#f5f5f6] text-[#7d7d87] text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5">
                  {diagnosisTypeLabel}
                </span>
                <span className="bg-[#0f8f64] text-white text-[10px] font-semibold rounded-full px-2 py-0.5">Principal</span>
              </div>
            </div>
          </div>
        )}
        {relatedList.map((x) => (
          <div key={x.code} className="border border-[#e0e0e4] bg-[#f5f5f6] rounded-[6px] px-3 py-2 flex items-start gap-2">
            <span className="bg-[#121215] text-white text-[10px] font-semibold rounded-[4px] px-1.5 py-0.5 shrink-0">{x.code}</span>
            <p className="text-[12px] font-semibold text-[#121215]">{x.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
