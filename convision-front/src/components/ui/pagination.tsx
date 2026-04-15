import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Alineado con diseño Figma (Table/Pagination): solo ← páginas →, página activa #121215 */
  variant?: 'default' | 'figma';
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  variant = 'default',
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (variant === 'figma') {
    const showEllipsisBeforeLast =
      totalPages > 5 && !pageNumbers.includes(totalPages);
    return (
      <div className={`flex items-center gap-1 ${className || ''}`}>
        <button
          type="button"
          aria-label="Página anterior"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e9] bg-white text-[13px] text-[#7d7d87] disabled:pointer-events-none disabled:opacity-40"
        >
          ←
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={
              currentPage === pageNumber
                ? 'inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-[#121215] text-[12px] font-semibold text-white'
                : 'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e9] bg-white text-[12px] text-[#7d7d87]'
            }
          >
            {pageNumber}
          </button>
        ))}
        {showEllipsisBeforeLast && (
          <>
            <span className="inline-flex size-8 shrink-0 items-center justify-center text-[12px] text-[#7d7d87]">
              ···
            </span>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e9] bg-white text-[12px] text-[#7d7d87]"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e9] bg-white text-[13px] text-[#121215] disabled:pointer-events-none disabled:opacity-40"
        >
          →
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        <ChevronLeft className="h-4 w-4 -ml-2" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={currentPage === pageNumber ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNumber)}
            className="w-8 h-8"
          >
            {pageNumber}
          </Button>
        ))}
        {totalPages > 5 && !pageNumbers.includes(totalPages) && (
          <>
            <span className="px-2">...</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8"
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4 ml-1" />
        <ChevronRight className="h-4 w-4 -mr-2" />
      </Button>
    </div>
  );
};

export default Pagination;
