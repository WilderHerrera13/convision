# Clinical History Tab

This folder contains the main clinical history form functionality, which is displayed in the "Historia Clínica" tab of the Clinical History Form.

## Structure

```
ClinicalHistoryTab/
├── index.tsx                    # Main clinical history form component
├── types.ts                     # TypeScript interfaces and types
├── schema.ts                    # Zod validation schema
├── README.md                    # This documentation
├── sections/                    # Individual form sections
│   ├── BasicDataSection.tsx     # Patient basic information
│   ├── ConsultationInfoSection.tsx # Consultation details
│   ├── CompanionResponsibleSection.tsx # Companion & responsible person
│   ├── Lensometria/             # Lensometry examinations
│   ├── Queratometria/           # Keratometry and refraction
│   ├── Subjetivo/               # Subjective examination
│   └── Diagnostico/             # Diagnosis section
├── hooks/
│   └── useClinicalHistoryForm.ts # Form state management and logic
└── utils/
    └── fieldHelpers.tsx         # Field rendering utilities
```

## Description

This tab contains the complete clinical history form with all examination sections, patient data, and diagnostic information. It uses a modular architecture with individual sections for different aspects of the clinical examination.

## Components

- **Form Sections**: Organized into logical groups (basic data, examinations, diagnosis)
- **Validation**: Real-time validation with visual feedback
- **Error Handling**: Comprehensive error display and handling
- **State Management**: Centralized form state with the useClinicalHistoryForm hook
