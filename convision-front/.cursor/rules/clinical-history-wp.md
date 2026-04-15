# UI Pattern: Action Button with Modal and History

This document describes a common UI pattern used in the application, featuring an action button that triggers a modal window for data entry/modification, along with a history tracking mechanism for the associated data.

## Characteristics

### 1. Action Button
*   **Appearance:** The button is typically rectangular with a green background.
*   **Text:**
    *   Initially, or when no modifications have been saved, the button displays a "+" icon/text.
    *   After data in the associated modal has been modified and saved at least once, the button displays "Modificar" (Modify).
*   **Functionality:** Pressing this button replaces the current section content with a new modal window.
*   **Sizing:** To prevent the button from changing size when the text changes from "+" to "Modificar", use fixed width sizing with `minWidth` or `width` properties in the button's `sx` prop.

### 2. Modal Window
*   **Content:** The modal window displays specific data fields relevant to the section it represents. These fields come with default values.
*   **Action Buttons:** The modal includes two action buttons at the bottom-right:
    *   **"Guardar" (Save):**
        *   This button is initially disabled if no changes have been made to the default data within the modal.
        *   It becomes enabled as soon as the user makes any changes to the data.
        *   Pressing this button saves the changes and updates the history.
    *   **"Cancelar" (Cancel):**
        *   This button allows the user to close the modal without saving any changes.

### 3. History Field
*   **Location:** Situated directly below the initial action button (the one that opens the modal).
*   **Initial State:** At the beginning, this history field is empty.
*   **Tracking Modifications:**
    *   When the user modifies data in the modal and presses "Guardar", an item representing this saved data appears in the history field.
    *   **Single Item Limit:** Only one item can exist in the history at any given time. Saving new modifications will replace the existing history item.
*   **Interaction:**
    *   The history item displays an 'x' button, allowing the user to delete it.
    *   Clicking on the history item itself re-opens the modal window with the saved data, similar to pressing the initial action button.

## Implementation Examples

### Button Sizing Solution
To prevent button size changes when switching between icon and "Modificar":

```tsx
<Button
  variant="contained"
  startIcon={savedData ? <Edit sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} /> : <Add sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} />}
  sx={{
    backgroundColor: '#8BC34A',
    color: 'white',
    '&:hover': {
      backgroundColor: '#7CB342'
    },
    textTransform: 'none',
    fontWeight: 500,
    width: '140px', // Fixed width prevents size changes
  }}
  onClick={handleOpenModal}
>
  {savedData ? 'Modificar' : ''}
</Button>
```

### Key Implementation Details
1. **Fixed Width:** Use `width: '140px'` (or appropriate size) for exact sizing to prevent button expansion.
2. **Icon Only vs Text:** When no data is saved, show only the icon (empty text). When data exists, show "Modificar".
3. **Avoid Double Icons:** Don't use both startIcon and text "+" - this creates visual duplication.
4. **Icon Sizing:** Use consistent icon sizing with `sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}`.