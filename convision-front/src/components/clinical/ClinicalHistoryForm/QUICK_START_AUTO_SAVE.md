# Quick Start: Auto-Save System

## 🚀 What's New?

The Clinical History Form now **automatically saves your work** as you type! No more lost data if you accidentally close the browser.

## 📋 How to Use

### 1. Open Clinical History Form

Click on "CREAR HISTORIA CLINICA" button for any patient.

### 2. Fill in Form Data

Start entering data in any tab:
- Historia Clínica ✅
- Rx Final ✅
- Contactología ✅
- Prótesis ✅
- Remisión ✅

### 3. Auto-Save Indicator

Look at the top-right of the tab header. You'll see:

- 🟢 **"Guardado"** (Green) - Data is saved
  - Shows: "Hace X segundos/minutos"
  
- 🟡 **"Sin guardar"** (Yellow) - Changes not yet saved
  
- 🔵 **"Guardando..."** (Blue) - Currently saving

### 4. Automatic Saving

- Form auto-saves **every 30 seconds**
- All tabs share the same save state
- Each patient has a separate saved draft

### 5. Load Saved Data

When you reopen the form for the same patient:
1. Click "CREAR HISTORIA CLINICA"
2. Form automatically loads your saved draft
3. Continue where you left off!

## 💡 Pro Tips

### Manual Save
If you want to save immediately:
```typescript
// The system saves automatically, but you can also trigger it
// by waiting for the auto-save interval (30 seconds)
```

### Clear Draft
To start fresh (removes saved draft):
```typescript
// Currently, clear localStorage manually in browser DevTools
localStorage.removeItem('clinical_history_draft_123'); // Replace 123 with patient ID
```

### Check Save Status
Look at the indicator:
- Green with time = Saved ✅
- Yellow = Not saved yet ⏳
- Blue = Saving now 🔄

## 🔍 Where is Data Stored?

- **Location**: Browser's localStorage
- **Key Format**: `clinical_history_draft_{patientId}`
- **Example**: `clinical_history_draft_123`

## 📝 What Gets Saved?

All form data from these tabs:
- ✅ Rx Final (prescriptions, visual acuity)
- ✅ Contactología (contact lens data)
- ✅ Prótesis (prosthesis details)
- ✅ Remisión (procedures, medications, exams)
- ✅ Historia Clínica (clinical data)

## 🛠️ Troubleshooting

### "My data isn't saving"
1. Check the indicator shows green "Guardado"
2. Wait 30 seconds after making changes
3. Check browser console for errors

### "My data isn't loading"
1. Make sure you're on the same patient
2. Check you're using the same browser
3. Verify localStorage in DevTools: `F12 → Application → Local Storage`

### "Clear all drafts"
In browser console (F12):
```javascript
// List all drafts
Object.keys(localStorage).filter(key => key.startsWith('clinical_history_draft_'));

// Clear specific draft
localStorage.removeItem('clinical_history_draft_123');

// Clear all drafts (BE CAREFUL!)
Object.keys(localStorage)
  .filter(key => key.startsWith('clinical_history_draft_'))
  .forEach(key => localStorage.removeItem(key));
```

## ⚙️ Configuration

### Change Save Interval
Default: 30 seconds

To change (requires code modification):
```typescript
// In ClinicalHistoryProvider
const [autoSaveInterval, setAutoSaveInterval] = useState(30000); // 30 seconds

// Change to 1 minute:
setAutoSaveInterval(60000);
```

### Disable Auto-Save
```typescript
const { setAutoSaveEnabled } = useClinicalHistoryContext();
setAutoSaveEnabled(false);
```

## 🎯 Best Practices

1. **Don't rely solely on auto-save** - Still submit the form properly when done
2. **Check the indicator** - Ensure it shows "Guardado" before closing
3. **Different browsers** - Drafts don't sync across browsers
4. **Private browsing** - May not save in incognito mode
5. **Regular cleanup** - Clear old drafts periodically

## 📊 Example Workflow

```
1. Click "CREAR HISTORIA CLINICA" for patient #123
2. Fill in Rx Final tab data
3. Indicator shows "🟡 Sin guardar"
4. Wait 30 seconds...
5. Indicator updates to "🟢 Guardado - Hace unos segundos"
6. Switch to Prótesis tab
7. Fill in prosthesis data
8. Close browser (accidentally!)
9. Reopen and click "CREAR HISTORIA CLINICA" for patient #123
10. ✅ All data is restored!
```

## 🔐 Privacy & Security

- ✅ Data stored locally in your browser only
- ✅ Each patient has separate storage
- ✅ No data sent to external servers (yet)
- ⚠️ Anyone with access to your browser can see drafts
- ⚠️ Clearing browser cache/data will delete drafts

## 🚦 Status Reference

| Indicator | Status | Meaning |
|-----------|--------|---------|
| 🟢 Guardado | Saved | All changes saved successfully |
| 🟡 Sin guardar | Unsaved | Changes pending save |
| 🔵 Guardando... | Saving | Currently saving to localStorage |

## 📞 Support

If you encounter issues:
1. Check browser console (F12)
2. Verify localStorage is enabled
3. Try clearing the specific draft and starting fresh
4. Contact development team

---

**Remember**: Auto-save is a draft system. Always complete and submit the form properly to save to the database!

