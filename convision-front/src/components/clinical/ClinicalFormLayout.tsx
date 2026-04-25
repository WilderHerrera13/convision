import React from 'react';

interface ClinicalFormLayoutProps {
  sidebar?: React.ReactNode;
  topbar: React.ReactNode;
  formCard: React.ReactNode;
  asidePanel: React.ReactNode;
  footer?: React.ReactNode;
}

export function ClinicalFormLayout({ sidebar, topbar, formCard, asidePanel, footer }: ClinicalFormLayoutProps) {
  return (
    <div className="flex h-screen bg-[#f5f5f6]">
      {sidebar && (
        <aside className="w-60 flex-shrink-0">{sidebar}</aside>
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-15 flex-shrink-0">{topbar}</header>
        <main className="flex flex-1 gap-6 p-6 overflow-auto">
          <div className="w-[780px] flex-shrink-0">{formCard}</div>
          <div className="w-[332px] flex-shrink-0">{asidePanel}</div>
        </main>
        {footer && <footer className="h-16 flex-shrink-0">{footer}</footer>}
      </div>
    </div>
  );
}
