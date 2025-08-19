import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnDef } from './column-types';
import {
  TextCellRenderer,
  DateCellRenderer,
  DateTimeCellRenderer,
  MoneyCellRenderer,
  StatusCellRenderer,
  BooleanCellRenderer,
  NumberCellRenderer,
  PercentCellRenderer,
  IdCellRenderer,
  EmailCellRenderer,
  PhoneCellRenderer
} from './cell-renderers';

/**
 * Creates a TanStack react-table compatible column definition from our custom type
 */
export function createColumnHelper<TData>(column: DataTableColumnDef): ColumnDef<TData> {
  const { id, header, type, accessorKey, accessorFn, meta = {}, enableSorting = true, cell: customCell } = column;
  
  // Base column definition
  const baseColumn: ColumnDef<TData> = {
    id,
    header,
    ...(accessorKey ? { accessorKey } : {}),
    ...(accessorFn ? { accessorFn } : { accessorKey: id }),
    enableSorting,
    meta
  };
  
  // If a custom cell renderer is provided, use it
  if (customCell) {
    return {
      ...baseColumn,
      cell: customCell,
    };
  }
  
  // Add cell rendering based on column type
  switch (type) {
    case 'text':
      return {
        ...baseColumn,
        cell: ({ getValue }) => <TextCellRenderer value={getValue()} />,
      };
      
    case 'date':
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <DateCellRenderer 
            value={getValue() as string | Date | null} 
            format={(column as any).format} 
          />
        ),
      };
      
    case 'datetime':
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <DateTimeCellRenderer 
            value={getValue() as string | Date | null} 
            format={(column as any).format} 
          />
        ),
      };
      
    case 'money':
      const moneyCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <MoneyCellRenderer 
            value={getValue() as number} 
            currency={moneyCol.currency}
            locale={moneyCol.locale}
            minimumFractionDigits={moneyCol.minimumFractionDigits}
            maximumFractionDigits={moneyCol.maximumFractionDigits}
          />
        ),
      };
      
    case 'status':
      const statusCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <StatusCellRenderer 
            value={getValue() as string} 
            statusMap={statusCol.statusMap}
            translations={statusCol.translations}
          />
        ),
      };
      
    case 'boolean':
      const boolCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <BooleanCellRenderer 
            value={getValue() as boolean} 
            trueLabel={boolCol.trueLabel}
            falseLabel={boolCol.falseLabel}
            useIcons={boolCol.useIcons}
          />
        ),
      };
      
    case 'number':
      const numCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <NumberCellRenderer 
            value={getValue() as number} 
            minimumFractionDigits={numCol.minimumFractionDigits}
            maximumFractionDigits={numCol.maximumFractionDigits}
          />
        ),
      };
      
    case 'percent':
      const percentCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <PercentCellRenderer 
            value={getValue() as number} 
            minimumFractionDigits={percentCol.minimumFractionDigits}
            maximumFractionDigits={percentCol.maximumFractionDigits}
            multiplier={percentCol.multiplier}
          />
        ),
      };
      
    case 'id':
      const idCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <IdCellRenderer 
            value={getValue() as string | number} 
            prefix={idCol.prefix}
          />
        ),
      };
      
    case 'email':
      const emailCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <EmailCellRenderer 
            value={getValue() as string} 
            linkify={emailCol.linkify}
          />
        ),
      };
      
    case 'phone':
      const phoneCol = column as any;
      return {
        ...baseColumn,
        cell: ({ getValue }) => (
          <PhoneCellRenderer 
            value={getValue() as string} 
            linkify={phoneCol.linkify}
          />
        ),
      };
      
    case 'actions':
      // For actions, we simply pass through the cell function from the column definition 
      // or use getValue if no custom cell is provided
      return {
        ...baseColumn,
        cell: column.cell || (info => info.getValue()),
      };
      
    default:
      // Default to text renderer if type is unknown
      return {
        ...baseColumn,
        cell: ({ getValue }) => <TextCellRenderer value={getValue()} />,
      };
  }
} 