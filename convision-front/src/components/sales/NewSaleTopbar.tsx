import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NewSaleTopbarProps {
  onSubmit: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

const NewSaleTopbar: React.FC<NewSaleTopbarProps> = ({ onSubmit, isLoading, isDisabled }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-[#e5e5e9] h-[60px] flex items-center justify-between px-6 shrink-0">
      <div className="flex flex-col gap-[2px]">
        <span className="text-[12px] text-[#7d7d87] leading-none">Ventas / Nueva Venta</span>
        <span className="text-[18px] font-semibold text-[#121212] leading-none">Nueva Venta</span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-[36px] px-4 border-[#e5e5e9] text-[#121212] text-[13px] font-semibold hover:bg-[#f5f5f6]"
          onClick={() => navigate('/receptionist/sales')}
        >
          Cancelar
        </Button>
        <Button
          className="h-[36px] px-4 bg-[#8753ef] hover:bg-[#7340d4] text-white text-[13px] font-semibold"
          onClick={onSubmit}
          disabled={isLoading || isDisabled}
        >
          {isLoading ? 'Procesando...' : 'Completar Venta'}
        </Button>
      </div>
    </div>
  );
};

export default NewSaleTopbar;
