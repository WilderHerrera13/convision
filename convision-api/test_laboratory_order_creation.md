# Test: Automatic Laboratory Order Creation for Lens Sales

## Overview

This test verifies that laboratory orders are automatically created when a sale includes lenses, ensuring that the optica can properly track lens manufacturing requirements.

## Prerequisites

1. At least one active laboratory in the system
2. At least one patient in the system
3. At least one lens product in the system
4. Valid authentication token

## Test Cases

### Test Case 1: Sale with Order Containing Lenses

**Scenario**: Create a sale linked to an order that contains lens items

**Steps**:

1. Create an order with lens items
2. Create a sale linked to that order
3. Verify laboratory order is automatically created

**Expected Result**: Laboratory order should be created automatically

### Test Case 2: Direct Sale with Lens Items

**Scenario**: Create a direct sale (not linked to order) with lens information

**API Request**:

```bash
curl -X POST http://localhost:8000/api/v1/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "subtotal": 100.00,
    "tax": 19.00,
    "discount": 0.00,
    "total": 119.00,
    "notes": "Test sale with lens",
    "payments": [{
      "payment_method_id": 1,
      "amount": 119.00,
      "payment_date": "2024-01-15",
      "notes": "Full payment"
    }],
    "contains_lenses": true,
    "lens_items": [{
      "lens_id": 1,
      "quantity": 1,
      "price": 100.00
    }]
  }'
```

**Expected Response**:

-   Sale created successfully
-   `laboratoryOrders` array contains at least one laboratory order
-   Laboratory order has status "pending"
-   Laboratory order is linked to the sale

### Test Case 3: Sale without Lenses

**Scenario**: Create a sale that doesn't contain any lenses

**Expected Result**: No laboratory order should be created

## Verification Steps

1. **Check Sale Response**: Verify the sale response includes `laboratoryOrders` array
2. **Check Database**: Verify laboratory order record exists in `laboratory_orders` table
3. **Check Logs**: Look for log entries indicating automatic laboratory order creation
4. **Frontend Notification**: Verify frontend shows notification about laboratory order creation

## Log Messages to Look For

```
Auto-creating laboratory order for lens sale
- sale_id: [ID]
- laboratory_id: [LAB_ID]
- reason: Sale contains lenses requiring laboratory manufacturing
```

## Database Verification

```sql
-- Check if laboratory order was created for the sale
SELECT lo.*, l.name as laboratory_name
FROM laboratory_orders lo
JOIN laboratories l ON lo.laboratory_id = l.id
WHERE lo.sale_id = [SALE_ID];

-- Check laboratory order status history
SELECT los.*, u.name as user_name
FROM laboratory_order_statuses los
JOIN users u ON los.user_id = u.id
WHERE los.laboratory_order_id = [LAB_ORDER_ID];
```

## Troubleshooting

### No Laboratory Order Created

1. Check if any active laboratories exist
2. Verify sale data includes lens information (`contains_lenses: true` or `lens_items` array)
3. Check application logs for warnings about missing laboratories

### Multiple Laboratory Orders Created

1. This should not happen - check for duplicate creation logic
2. Verify `createLaboratoryOrderFromSale` method checks for existing orders

## Success Criteria

-   ✅ Laboratory order automatically created for lens sales
-   ✅ No laboratory order created for non-lens sales
-   ✅ Frontend shows notification when laboratory order is created
-   ✅ Laboratory order has correct status and relationships
-   ✅ System logs indicate automatic creation
