import React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal } from 'lucide-react';
import type { FilterOption } from '@/services/lensService';

interface ProductFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: FilterOption[];
  brands: FilterOption[];
  materials: FilterOption[];
  lensClasses: FilterOption[];
  treatments: FilterOption[];
  selectedType: FilterOption | null;
  selectedBrand: FilterOption | null;
  selectedMaterial: FilterOption | null;
  selectedLensClass: FilterOption | null;
  selectedTreatment: FilterOption | null;
  loading: boolean;
  onTypeChange: (v: FilterOption | null) => void;
  onBrandChange: (v: FilterOption | null) => void;
  onMaterialChange: (v: FilterOption | null) => void;
  onLensClassChange: (v: FilterOption | null) => void;
  onTreatmentChange: (v: FilterOption | null) => void;
  onApply: () => void;
  onReset: () => void;
  activeCount: number;
}

const FilterSelect = ({
  label,
  value,
  options,
  disabled,
  placeholder,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  disabled?: boolean;
  placeholder: string;
  allLabel: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-slate-700">{label}</Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={disabled ? 'opacity-70' : ''}>
        <SelectValue placeholder={disabled ? 'Cargando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id.toString()}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  open,
  onOpenChange,
  types,
  brands,
  materials,
  lensClasses,
  treatments,
  selectedType,
  selectedBrand,
  selectedMaterial,
  selectedLensClass,
  selectedTreatment,
  loading,
  onTypeChange,
  onBrandChange,
  onMaterialChange,
  onLensClassChange,
  onTreatmentChange,
  onApply,
  onReset,
  activeCount,
}) => {
  const resolve = (options: FilterOption[], val: FilterOption | null) =>
    val ? val.id.toString() : 'all';

  const findById = (options: FilterOption[], id: string) =>
    options.find((o) => o.id.toString() === id) ?? null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 relative">
          <SlidersHorizontal size={16} />
          Filtros
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-6 max-h-[85vh] overflow-y-auto">
        <DrawerHeader className="flex justify-between items-center mb-2 px-0">
          <DrawerTitle className="text-xl font-bold">Filtros de búsqueda</DrawerTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              Limpiar
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">Cancelar</Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 py-4">
          <FilterSelect
            label="Tipo"
            value={resolve(types, selectedType)}
            options={types}
            disabled={loading}
            placeholder="Seleccionar tipo"
            allLabel="Todos los tipos"
            onChange={(v) => onTypeChange(v === 'all' ? null : findById(types, v))}
          />
          <FilterSelect
            label="Marca"
            value={resolve(brands, selectedBrand)}
            options={brands}
            disabled={loading}
            placeholder="Seleccionar marca"
            allLabel="Todas las marcas"
            onChange={(v) => onBrandChange(v === 'all' ? null : findById(brands, v))}
          />
          <FilterSelect
            label="Material"
            value={resolve(materials, selectedMaterial)}
            options={materials}
            placeholder="Seleccionar material"
            allLabel="Todos los materiales"
            onChange={(v) => onMaterialChange(v === 'all' ? null : findById(materials, v))}
          />
          <FilterSelect
            label="Clase"
            value={resolve(lensClasses, selectedLensClass)}
            options={lensClasses}
            placeholder="Seleccionar clase"
            allLabel="Todas las clases"
            onChange={(v) => onLensClassChange(v === 'all' ? null : findById(lensClasses, v))}
          />
          <FilterSelect
            label="Tratamiento"
            value={resolve(treatments, selectedTreatment)}
            options={treatments}
            placeholder="Seleccionar tratamiento"
            allLabel="Todos los tratamientos"
            onChange={(v) => onTreatmentChange(v === 'all' ? null : findById(treatments, v))}
          />
        </div>

        <DrawerFooter className="flex flex-row justify-end gap-2 pt-4 border-t px-0">
          <Button
            onClick={() => { onApply(); onOpenChange(false); }}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
          >
            Aplicar filtros
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ProductFilters;
