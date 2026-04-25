interface TabItem {
  label: string;
  completed: boolean;
}

interface ClinicalTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function ClinicalTabBar({ tabs, activeIndex, onTabChange }: ClinicalTabBarProps) {
  return (
    <div className="flex border-b border-[#e5e5e9] bg-white">
      {tabs.map((tab, i) => (
        <button
          key={tab.label}
          type="button"
          onClick={() => onTabChange(i)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            i === activeIndex
              ? 'border-[#0f8f64] text-[#0f0f12] font-medium'
              : 'border-transparent text-[#7d7d87] hover:text-[#0f0f12]'
          }`}
        >
          {tab.label}
          {tab.completed && (
            <span className="w-1.5 h-1.5 bg-[#0f8f64] rounded-full flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
