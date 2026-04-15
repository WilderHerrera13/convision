# 🧪 Testing Auto-Save System - Step by Step

## Quick Test (2 minutes)

### Step 1: Open Clinical History Form
1. Navigate to a patient's page
2. Click **"CREAR HISTORIA CLINICA"** button
3. Form opens with all tabs visible

### Step 2: Notice Auto-Save Indicator
Look at the **top-right** of the tab header:
```
┌──────────────────────────────────────────┐
│ Tabs...                  [🟡 Sin guardar]│
└──────────────────────────────────────────┘
```

### Step 3: Enter Some Data
Switch to **"Prótesis"** tab and enter:
- Prótesis: "Test Prosthesis"
- OD: "8.5"
- Esclera: Select "Blanca"

### Step 4: Watch Auto-Save
Wait **30 seconds** and watch the indicator change:
```
🟡 Sin guardar  →  🔵 Guardando...  →  🟢 Guardado (Hace unos segundos)
```

### Step 5: Test Persistence
1. **Close the browser tab** (or navigate away)
2. **Reopen** the form for the same patient
3. Go to **"Prótesis"** tab
4. ✅ **Verify**: Your data is still there!

---

## Detailed Test Scenarios

### 🧪 Scenario 1: Multi-Tab Data Persistence

**Goal**: Verify data saves across multiple tabs

1. **Rx Final Tab**:
   ```
   - Fecha: "miércoles, 2 de octubre de 2025"
   - OD Esfera: "-3.50"
   - OI Cilindro: "-1.25"
   ```

2. **Contactología Tab**:
   ```
   - Documento: "9876543210"
   - Tipo de lente: "Esféricos"
   ```

3. **Prótesis Tab**:
   ```
   - Prótesis: "Custom Design"
   - Esclera: "Amarillenta"
   ```

4. Wait 30 seconds (check indicator shows "Guardado")

5. **Close browser**

6. **Reopen form**

7. ✅ **Verify** all three tabs have saved data

---

### 🧪 Scenario 2: Different Patients

**Goal**: Verify patient-specific storage

**Patient A (ID: 123)**:
1. Open form for Patient A
2. Enter data: "Patient A Data"
3. Wait for save
4. Close form

**Patient B (ID: 456)**:
1. Open form for Patient B
2. Enter data: "Patient B Data"
3. Wait for save
4. Close form

**Verification**:
1. Reopen form for Patient A
2. ✅ Should see "Patient A Data"
3. Reopen form for Patient B
4. ✅ Should see "Patient B Data"

---

### 🧪 Scenario 3: Complex Data (Remisión Tab)

**Goal**: Test table/array data persistence

1. Go to **"Remisión"** tab
2. Navigate to **"Medicamentos"** sub-tab
3. Add a medication:
   ```
   - Nombre Comercial: "Eye Drops XYZ"
   - Principio Activo: "Artificial Tears"
   - Dosis: "Aplicar cada 4 horas"
   ```
4. Click "+" to add to table
5. Add another medication
6. Wait for auto-save
7. **Close and reopen**
8. ✅ Verify both medications are in the table

---

### 🧪 Scenario 4: Real-time Save Status

**Goal**: Observe save status changes

1. Open DevTools Console (F12)
2. Enter data in any field
3. Watch console for: `"✅ Auto-saved clinical history data to localStorage"`
4. Observe indicator:
   - Immediate: 🟡 "Sin guardar"
   - After 30s: 🔵 "Guardando..."
   - Then: 🟢 "Guardado"

---

## 🔍 Manual Testing Commands

### Check localStorage (Browser Console)

```javascript
// 1. See what's stored for current patient (replace 123 with actual patient ID)
const patientId = 123;
const key = `clinical_history_draft_${patientId}`;
const data = JSON.parse(localStorage.getItem(key));
console.log('Saved data:', data);

// 2. See all saved drafts
Object.keys(localStorage)
  .filter(k => k.startsWith('clinical_history_draft_'))
  .forEach(k => {
    console.log(k, JSON.parse(localStorage.getItem(k)));
  });

// 3. See when last saved
console.log('Last saved:', new Date(data.lastSaved).toLocaleString());

// 4. See specific tab data
console.log('Protesis data:', data.protesisTab);
console.log('Rx Final data:', data.rxFinalTab);
```

### Clear Saved Draft

```javascript
// Clear for specific patient
localStorage.removeItem('clinical_history_draft_123'); // Replace 123

// Clear all drafts
Object.keys(localStorage)
  .filter(k => k.startsWith('clinical_history_draft_'))
  .forEach(k => localStorage.removeItem(k));

console.log('Drafts cleared!');
```

---

## 📊 Expected Results

### ✅ Success Criteria

| Test | Expected Result |
|------|----------------|
| Auto-save interval | Saves every 30 seconds |
| Visual indicator | Shows correct status (🟢/🟡/🔵) |
| Data persistence | Data loads on reopen |
| Multi-tab support | All tabs save correctly |
| Patient separation | Each patient has own draft |
| Console logging | Shows save messages |

### ❌ Failure Indicators

| Issue | What to Check |
|-------|--------------|
| Indicator stays yellow | Check console for errors |
| Data doesn't load | Verify patient ID matches |
| Data incomplete | Check specific tab integration |
| No console logs | Verify auto-save is enabled |

---

## 🐛 Troubleshooting

### Issue: "Data not saving"

**Check**:
```javascript
// Is auto-save enabled?
console.log('Auto-save enabled:', /* check in context */);

// Is localStorage working?
localStorage.setItem('test', 'value');
console.log('localStorage test:', localStorage.getItem('test'));
localStorage.removeItem('test');

// Check quota
navigator.storage.estimate().then(estimate => {
  console.log('Storage used:', estimate.usage);
  console.log('Storage quota:', estimate.quota);
});
```

### Issue: "Data not loading"

**Check**:
```javascript
// Does data exist?
const patientId = 123; // Replace with actual ID
const key = `clinical_history_draft_${patientId}`;
console.log('Data exists:', localStorage.getItem(key) !== null);

// Is it valid JSON?
try {
  const data = JSON.parse(localStorage.getItem(key));
  console.log('Valid data:', data);
} catch (e) {
  console.error('Invalid JSON:', e);
}
```

### Issue: "Wrong data loads"

**Check**:
```javascript
// Verify patient ID
console.log('Current patient ID:', /* from props */);
console.log('Storage key:', `clinical_history_draft_${patientId}`);

// List all saved patients
Object.keys(localStorage)
  .filter(k => k.startsWith('clinical_history_draft_'))
  .forEach(k => {
    const id = k.replace('clinical_history_draft_', '');
    console.log('Patient ID:', id);
  });
```

---

## 📹 Video Test Script

### Recording a Test Demo

1. **Setup** (0:00-0:30)
   - Open patient page
   - Show patient ID clearly
   - Click "CREAR HISTORIA CLINICA"

2. **Enter Data** (0:30-1:00)
   - Go to Prótesis tab
   - Fill in 3-4 fields
   - Show indicator is yellow

3. **Wait for Save** (1:00-1:30)
   - Show timer/clock
   - Wait 30 seconds
   - Point to indicator turning green

4. **Demonstrate Persistence** (1:30-2:00)
   - Close browser tab
   - Reopen clinical history
   - Show data is still there

5. **Advanced** (2:00-2:30)
   - Open DevTools
   - Show localStorage data
   - Show console logs

---

## 🎯 Test Checklist

Before marking as complete, verify:

- [ ] Auto-save indicator appears in header
- [ ] Indicator shows "Sin guardar" when typing
- [ ] Indicator changes to "Guardado" after 30s
- [ ] Data persists after closing browser
- [ ] Multiple tabs save correctly
- [ ] Different patients have separate drafts
- [ ] Console shows save messages
- [ ] localStorage contains correct data
- [ ] Data structure is valid JSON
- [ ] Timestamp updates on each save

---

## 📝 Test Report Template

```markdown
## Test Report: Auto-Save System

**Date**: ___________
**Tester**: ___________
**Browser**: ___________

### Test Results

| Scenario | Status | Notes |
|----------|--------|-------|
| Basic auto-save | ✅/❌ | |
| Multi-tab save | ✅/❌ | |
| Data persistence | ✅/❌ | |
| Patient separation | ✅/❌ | |
| Visual indicator | ✅/❌ | |
| Console logging | ✅/❌ | |

### Issues Found
1. ___________
2. ___________

### Screenshots
[Attach screenshots here]

### Browser Console Output
```
[Paste console output]
```

### localStorage Data
```json
[Paste saved data]
```
```

---

**Happy Testing! 🚀**

If you find any issues, check the console first, then review the documentation files.

