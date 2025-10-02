# Auto-Save System for Clinical History Form

## Overview

The Clinical History Form now includes a comprehensive auto-save system that automatically saves form data to `localStorage` and loads it when the form is reopened. This ensures that no data is lost if the user accidentally closes the browser or navigates away.

## Features

✅ **Automatic Saving**: Form data is automatically saved every 30 seconds (configurable)  
✅ **Cross-Tab State Management**: All tabs share a unified state through React Context  
✅ **LocalStorage Persistence**: Data is saved to browser's localStorage  
✅ **Auto-Load on Open**: Saved data is automatically loaded when opening the form  
✅ **Visual Indicator**: Shows save status and time since last save  
✅ **Patient-Specific Storage**: Each patient's draft is stored separately  

## Architecture

### 1. **ClinicalHistoryContext** (`context/ClinicalHistoryContext.tsx`)

Central state management for all tabs:

```typescript
interface ClinicalHistoryFormData {
  patient_id?: number;
  clinicalHistoryTab?: Record<string, any>;
  rxFinalTab?: { ... };
  contactologiaTab?: { ... };
  protesisTab?: { ... };
  remisionTab?: { ... };
  evolucionesTab?: Record<string, any>;
  documentosTab?: Record<string, any>;
  lastSaved?: string;
  lastModified?: string;
}
```

**Key Functions**:
- `updateTabData(tabName, data)` - Update entire tab data
- `updateField(tabName, field, value)` - Update single field
- `saveToLocalStorage()` - Manually trigger save
- `loadFromLocalStorage(patientId)` - Load saved data
- `clearFormData()` - Clear draft data

### 2. **Auto-Save Hook** (`hooks/useAutoSaveIndicator.ts`)

Provides save status information:

```typescript
const { 
  saveStatus,        // 'saved' | 'saving' | 'unsaved'
  timeSinceLastSave, // Human-readable time
  isAutoSaveEnabled,
  lastSaved 
} = useAutoSaveIndicator();
```

### 3. **Auto-Save Indicator** (`components/AutoSaveIndicator.tsx`)

Visual component showing save status in the tab header.

## How It Works

### Data Flow

1. **User Types** → Component's local state updates
2. **State Update** → Context is updated immediately via `updateField()` or `updateTabData()`
3. **Auto-Save Timer** → Every 30s, context data is saved to localStorage
4. **Indicator Updates** → Visual feedback shows save status

### localStorage Key Format

```
clinical_history_draft_{patientId}
```

Example: `clinical_history_draft_123`

### Data Structure in localStorage

```json
{
  "patient_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "rxFinalTab": {
    "fecha": "...",
    "od_esfera": "-5.00",
    ...
  },
  "protesisTab": {
    "protesis": "...",
    ...
  },
  "lastSaved": "2025-10-02T10:30:00.000Z",
  "lastModified": "2025-10-02T10:29:45.000Z"
}
```

## Usage in Tabs

Each tab should follow this pattern:

```typescript
import { useClinicalHistoryContext } from '../context/ClinicalHistoryContext';

const MyTab: React.FC = () => {
  const { formData: globalFormData, updateField, updateTabData } = useClinicalHistoryContext();
  
  const [localFormData, setLocalFormData] = useState({ /* defaults */ });

  // Load from context on mount
  useEffect(() => {
    if (globalFormData.myTab) {
      setLocalFormData(prev => ({
        ...prev,
        ...globalFormData.myTab
      }));
    }
  }, []);

  // Handle input changes
  const handleInputChange = (field: string) => (event: any) => {
    const value = event.target.value;
    setLocalFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update context immediately for auto-save
    updateField('myTab', field, value);
  };

  // ... rest of component
};
```

## Configuration

### Change Auto-Save Interval

```typescript
const { setAutoSaveInterval } = useClinicalHistoryContext();

// Set to 60 seconds
setAutoSaveInterval(60000);
```

### Disable/Enable Auto-Save

```typescript
const { setAutoSaveEnabled } = useClinicalHistoryContext();

setAutoSaveEnabled(false); // Disable
setAutoSaveEnabled(true);  // Enable
```

## Tabs Integration Status

✅ **Integrated Tabs**:
- ProtesisTab
- RxFinalTab
- ContactologiaTab
- RemisionTab

⏳ **Pending Tabs** (UI-only, no forms):
- EvolucionesTab (view-only)
- DocumentosTab (view-only)

✅ **Special Tab**:
- ClinicalHistoryTab (uses react-hook-form, separate integration)

## Testing

### Test Auto-Save Functionality

1. **Open Form**: Navigate to patient's clinical history
2. **Enter Data**: Fill in some fields in any tab
3. **Wait 30s**: Auto-save indicator should show "Guardado"
4. **Close Tab**: Close the browser tab
5. **Reopen Form**: Navigate back to the same patient
6. **Verify**: Data should be restored

### Test Manual Save

```typescript
const { saveToLocalStorage } = useClinicalHistoryContext();

// Trigger manual save
saveToLocalStorage();
```

### Test Clear Draft

```typescript
const { clearFormData } = useClinicalHistoryContext();

// Clear saved draft
clearFormData();
```

## Browser Compatibility

✅ All modern browsers with localStorage support:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)
- Opera 11.5+

## Limitations

1. **Storage Size**: localStorage limit is typically 5-10MB per domain
2. **Browser-Specific**: Data is stored per browser (not synced across devices)
3. **Clearing Cache**: Clearing browser data will delete saved drafts
4. **Private/Incognito**: localStorage may not persist in private browsing

## Future Enhancements

- [ ] Backend sync for multi-device support
- [ ] Conflict resolution for concurrent edits
- [ ] Version history
- [ ] Export/import draft data
- [ ] Cloud backup option

## Troubleshooting

### Data Not Saving

1. Check browser console for errors
2. Verify localStorage is enabled
3. Check storage quota
4. Ensure `isAutoSaveEnabled` is true

### Data Not Loading

1. Verify patient ID matches
2. Check localStorage key exists: `clinical_history_draft_{patientId}`
3. Inspect localStorage data in DevTools

### Clear Stuck Data

```javascript
// In browser console
localStorage.removeItem('clinical_history_draft_123'); // Replace 123 with patient ID
```

## API Reference

### ClinicalHistoryContext

```typescript
interface ClinicalHistoryContextType {
  formData: ClinicalHistoryFormData;
  updateTabData: (tabName: string, data: any) => void;
  updateField: (tabName: string, field: string, value: any) => void;
  loadFromLocalStorage: (patientId: number) => void;
  saveToLocalStorage: () => void;
  clearFormData: () => void;
  isAutoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
}
```

### useAutoSaveIndicator

```typescript
interface AutoSaveIndicatorReturn {
  saveStatus: 'saved' | 'saving' | 'unsaved';
  timeSinceLastSave: string;
  isAutoSaveEnabled: boolean;
  lastSaved: string | null;
}
```

