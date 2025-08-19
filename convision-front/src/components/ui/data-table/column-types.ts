// Column type definitions for DataTable
import React from 'react';
import { ColumnDef, CellContext } from '@tanstack/react-table';

// Generic handling for all supported column types
export type DataTableColumnType = 
  | 'text'
  | 'date'
  | 'datetime'
  | 'money'
  | 'status'
  | 'boolean'
  | 'number'
  | 'percent'
  | 'id'
  | 'email'
  | 'phone'
  | 'actions';

// Base column definition that all columns will extend
export interface BaseColumnDef {
  id: string;
  header: string;
  type: DataTableColumnType;
  accessorKey?: string;
  accessorFn?: (row: any) => any;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  className?: string;
  meta?: Record<string, unknown>;
  // Custom cell renderer
  cell?: (props: CellContext<any, unknown>) => React.ReactNode;
}

// Text column definition
export interface TextColumnDef extends BaseColumnDef {
  type: 'text';
}

// Date column definition
export interface DateColumnDef extends BaseColumnDef {
  type: 'date';
  format?: string; // Optional custom format
}

// Date with time column definition
export interface DateTimeColumnDef extends BaseColumnDef {
  type: 'datetime';
  format?: string; // Optional custom format
}

// Money column definition
export interface MoneyColumnDef extends BaseColumnDef {
  type: 'money';
  currency?: string; // Default: '$'
  locale?: string; // Default: 'es-CO'
  maximumFractionDigits?: number; // Default: 2
  minimumFractionDigits?: number; // Default: 2
}

// Status column definition with badge support
export interface StatusColumnDef extends BaseColumnDef {
  type: 'status';
  // Maps status values to variants
  statusMap?: Record<string, string>; 
  // Optional translations for status values
  translations?: Record<string, string>;
}

// Boolean column definition
export interface BooleanColumnDef extends BaseColumnDef {
  type: 'boolean';
  trueLabel?: string; // Default: "Sí"
  falseLabel?: string; // Default: "No"
  useIcons?: boolean; // Default: true
}

// Number column definition
export interface NumberColumnDef extends BaseColumnDef {
  type: 'number';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// Percentage column definition
export interface PercentColumnDef extends BaseColumnDef {
  type: 'percent';
  maximumFractionDigits?: number; // Default: 2
  minimumFractionDigits?: number; // Default: 2
  multiplier?: boolean; // Default: false (if true, will multiply value by 100)
}

// ID column definition
export interface IdColumnDef extends BaseColumnDef {
  type: 'id';
  prefix?: string;
}

// Email column definition
export interface EmailColumnDef extends BaseColumnDef {
  type: 'email';
  linkify?: boolean; // Default: true
}

// Phone column definition
export interface PhoneColumnDef extends BaseColumnDef {
  type: 'phone';
  linkify?: boolean; // Default: true
}

// Actions column definition
export interface ActionsColumnDef extends BaseColumnDef {
  type: 'actions';
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: any) => void;
    show?: (row: any) => boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }>;
}

// Union type for all possible column definitions
export type DataTableColumnDef =
  | TextColumnDef
  | DateColumnDef
  | DateTimeColumnDef
  | MoneyColumnDef
  | StatusColumnDef
  | BooleanColumnDef
  | NumberColumnDef
  | PercentColumnDef
  | IdColumnDef
  | EmailColumnDef
  | PhoneColumnDef
  | ActionsColumnDef;

// Helper to convert our typed column defs to @tanstack/react-table ColumnDef
export type ConvertToReactTableColumnDef<T> = ColumnDef<T>; 