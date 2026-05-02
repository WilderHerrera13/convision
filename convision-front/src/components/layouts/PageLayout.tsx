import React from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  title: string;
  omitTopbar?: boolean;
  subtitle?: string;
  /** Clases extra para el subtítulo (p. ej. varias líneas como en Figma admin). */
  subtitleClassName?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  /** Sustituye altura fija del topbar (p. ej. `min-h-[100px] h-auto py-4` para P7 Figma). */
  topbarClassName?: string;
  /** Espaciado entre título y subtítulo (p. ej. `gap-1.5`). */
  titleStackClassName?: string;
}

/**
 * Standard page shell used by all inner pages.
 * Provides the topbar (title + optional CTA) and a scrollable content area,
 * matching the Dashboard's visual structure.
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  omitTopbar,
  subtitle,
  subtitleClassName,
  actions,
  children,
  contentClassName,
  topbarClassName,
  titleStackClassName,
}) => (
  <div className="flex flex-col h-full overflow-hidden">
    {!omitTopbar && (
      <div
        className={cn(
          'bg-white border-b border-convision-border flex items-center justify-between px-6 shrink-0',
          topbarClassName ?? 'h-[56px]',
        )}
      >
        <div className={cn('flex flex-col min-w-0 flex-1 pr-4', titleStackClassName ?? 'gap-[3px]')}>
          <span className="text-[16px] font-semibold text-[#0f0f12] leading-none">{title}</span>
          {subtitle && (
            <span
              className={cn(
                'text-[12px] text-convision-text-secondary',
                subtitleClassName ?? 'leading-none',
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 items-end gap-4">{actions}</div>}
      </div>
    )}

    <div className={`flex-1 overflow-y-auto p-6 ${contentClassName ?? ''}`}>
      {children}
    </div>
  </div>
);

export default PageLayout;
