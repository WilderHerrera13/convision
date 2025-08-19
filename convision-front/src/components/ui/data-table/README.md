# DataTable Component

A centralized, reusable data table component for the Convision application that provides consistent rendering and formatting for different types of data.

## Features

- Consistent date and time formatting
- Consistent money and number formatting
- Status badges
- Sortable columns
- Pagination
- Search functionality
- Loading states
- Customizable cell renderers
- Type-safe column definitions

## Usage

### Basic Example

```tsx
import React from "react";
import { DataTable, DataTableColumnDef } from "@/components/ui/data-table";

const MyComponent = () => {
  const data = [
    { id: 1, name: "John Doe", amount: 1000, created_at: "2023-05-15" },
    { id: 2, name: "Jane Smith", amount: 2000, created_at: "2023-06-20" },
  ];

  const columns: DataTableColumnDef[] = [
    {
      id: "id",
      header: "ID",
      type: "number",
    },
    {
      id: "name",
      header: "Name",
      type: "text",
    },
    {
      id: "amount",
      header: "Amount",
      type: "money",
    },
    {
      id: "created_at",
      header: "Date",
      type: "date",
    },
  ];

  return <DataTable data={data} columns={columns} />;
};
```

### Column Types

The DataTable supports the following column types:

- `text`: Regular text content
- `date`: Date formatted as DD/MM/YYYY
- `datetime`: Date and time formatted as DD/MM/YYYY HH:MM
- `money`: Currency values
- `status`: Status indicators with badges
- `boolean`: True/false values
- `number`: Numeric values
- `percent`: Percentage values
- `id`: Identifiers
- `email`: Email addresses with mailto links
- `phone`: Phone numbers with tel links
- `actions`: Custom actions

### Advanced Example

```tsx
import React from "react";
import { DataTable, DataTableColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

const AdvancedExample = () => {
  const [data, setData] = useState([
    /* ... */
  ]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleEdit = (id: number) => {
    console.log("Edit item", id);
  };

  const handleDelete = (id: number) => {
    console.log("Delete item", id);
  };

  const columns: DataTableColumnDef[] = [
    {
      id: "id",
      header: "ID",
      type: "id",
      prefix: "#",
    },
    {
      id: "name",
      header: "Name",
      type: "text",
    },
    {
      id: "price",
      header: "Price",
      type: "money",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    {
      id: "discount",
      header: "Discount",
      type: "percent",
      multiplier: true,
    },
    {
      id: "status",
      header: "Status",
      type: "status",
      statusMap: {
        active: "success",
        inactive: "destructive",
        pending: "warning",
      },
      translations: {
        active: "Activo",
        inactive: "Inactivo",
        pending: "Pendiente",
      },
    },
    {
      id: "email",
      header: "Email",
      type: "email",
      linkify: true,
    },
    {
      id: "created_at",
      header: "Created At",
      type: "datetime",
    },
    {
      id: "actions",
      header: "Actions",
      type: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original.id)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={loading}
      enablePagination={true}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      enableSearch={true}
      onSearch={handleSearch}
      onRowClick={handleRowClick}
    />
  );
};
```

## Props

The DataTable component accepts the following props:

| Prop                | Type                           | Description                             |
| ------------------- | ------------------------------ | --------------------------------------- |
| `data`              | `T[]`                          | Array of data to display                |
| `columns`           | `DataTableColumnDef[]`         | Column definitions                      |
| `loading`           | `boolean`                      | Whether the table is loading            |
| `error`             | `string`                       | Error message to display                |
| `emptyMessage`      | `string`                       | Message to display when there's no data |
| `onRowClick`        | `(row: T) => void`             | Callback when a row is clicked          |
| `enableSorting`     | `boolean`                      | Whether to enable sorting               |
| `enablePagination`  | `boolean`                      | Whether to show pagination controls     |
| `currentPage`       | `number`                       | Current page number                     |
| `totalPages`        | `number`                       | Total number of pages                   |
| `onPageChange`      | `(page: number) => void`       | Callback when page changes              |
| `enableSearch`      | `boolean`                      | Whether to show search input            |
| `onSearch`          | `(searchTerm: string) => void` | Callback when search is performed       |
| `searchPlaceholder` | `string`                       | Placeholder for search input            |
| `className`         | `string`                       | Additional CSS classes                  |
| `loadingMessage`    | `string`                       | Message to display when loading         |
