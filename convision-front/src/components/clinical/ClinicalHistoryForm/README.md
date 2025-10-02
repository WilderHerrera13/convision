# Clinical History Form - Modular Architecture

This directory contains a modularized version of the Clinical History Form, broken down into manageable, focused components.

## 🔄 Auto-Save System

**NEW**: The form now includes an automatic save system that:
- ✅ Saves data to localStorage every 30 seconds
- ✅ Loads saved data when reopening the form
- ✅ Shows visual save status indicator
- ✅ Stores data per patient (separate drafts)

[📖 See detailed documentation](./AUTO_SAVE_SYSTEM.md)

## 📁 Structure

```
ClinicalHistoryForm/
├── index.tsx                    # Main form component
├── types.ts                     # TypeScript interfaces and types
├── schema.ts                    # Zod validation schema
├── README.md                    # This documentation
├── sections/                    # Individual form sections
│   ├── BasicDataSection.tsx     # Patient basic information
│   ├── ConsultationInfoSection.tsx # Consultation details
│   └── CompanionResponsibleSection.tsx # Companion & responsible person
├── hooks/
│   └── useClinicalHistoryForm.ts # Form state management and logic
└── utils/
    └── fieldHelpers.tsx         # Field rendering utilities
```

## 🧩 Components Overview

### Main Components

- **`index.tsx`** - The main form component that orchestrates all sections
- **`types.ts`** - All TypeScript interfaces and type definitions
- **`schema.ts`** - Zod validation schema for form data

### Sections (`sections/`)

Each section is a self-contained component that handles its own fields and layout:

- **`BasicDataSection`** - Patient name, document, age, etc.
- **`ConsultationInfoSection`** - Consultation type, attention type, etc.
- **`CompanionResponsibleSection`** - Companion and responsible person details

### Hooks (`hooks/`)

- **`useClinicalHistoryForm`** - Custom hook containing all form logic, state management, validation effects, and API calls

### Utils (`utils/`)

- **`fieldHelpers`** - Reusable field rendering functions for different input types (text, select, checkbox, textarea)

## 🚀 Adding New Sections

To add a new section to the form:

### 1. Create the Section Component

Create a new file in `sections/` (e.g., `NewSection.tsx`):

```tsx
import React from 'react';
import { Box } from '@mui/material';
import { SectionProps, FieldDefinition } from '../types';

const NewSection: React.FC<SectionProps> = ({ form, serverErrors, renderField }) => {
  const fields: FieldDefinition[] = [
    { 
      name: "new_field", 
      label: "New Field", 
      type: "text", 
      required: true,
      placeholder: "Enter value"
    }
    // Add more fields as needed
  ];

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
      gap: 2
    }}>
      {fields.map(field => {
        const renderedField = renderField(field);
        if (!renderedField) return null;
        
        return (
          <Box key={field.name}>
            {renderedField}
          </Box>
        );
      })}
    </Box>
  );
};

export default NewSection;
```

### 2. Update the Schema

Add validation for new fields in `schema.ts`:

```tsx
export const clinicalHistorySchema = z.object({
  // ... existing fields
  new_field: z.string()
    .refine((val) => !val || val.length <= 100, {
      message: 'Field must not exceed 100 characters'
    })
    .optional(),
});
```

### 3. Update Default Values

Add default values in `hooks/useClinicalHistoryForm.ts`:

```tsx
defaultValues: {
  // ... existing defaults
  new_field: '',
}
```

### 4. Register the Section

In `index.tsx`, import and add the section:

```tsx
import NewSection from './sections/NewSection';

// Add to sections array
const sections: SectionDefinition[] = [
  // ... existing sections
  {
    title: "New Section",
    priority: 'medium',
    defaultExpanded: false,
    collapsible: true,
    fields: []
  }
];

// Add to renderSectionContent function
const renderSectionContent = (section: SectionDefinition) => {
  switch (section.title) {
    // ... existing cases
    case "New Section":
      return <NewSection {...sectionProps} />;
    default:
      return null;
  }
};
```

## 🎨 Customizing Field Rendering

The `fieldHelpers.tsx` utility provides flexible field rendering. You can:

- Add new field types by extending the switch statement in `createFieldRenderer`
- Customize validation logic for specific fields
- Add custom styling or behavior for certain field names

## 🔧 Benefits of This Architecture

1. **Maintainability** - Each section is self-contained and focused
2. **Reusability** - Field helpers and hooks can be reused
3. **Scalability** - Easy to add new sections without touching existing code
4. **Testability** - Each component can be tested in isolation
5. **Performance** - Sections can be lazy-loaded if needed
6. **Developer Experience** - Clear separation of concerns and easy to navigate

## 📝 Usage

The form is used exactly the same way as before:

```tsx
import ClinicalHistoryForm from '@/components/clinical/ClinicalHistoryForm';

<ClinicalHistoryForm
  patient={patient}
  initialData={initialData}
  onCancel={handleCancel}
  onSave={handleSave}
/>
```

The modular architecture is completely transparent to consumers of the component. 