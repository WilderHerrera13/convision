# 21 — Dashboard

## Source files
- Controller: `app/Http/Controllers/Api/V1/DashboardController.php`

---

## Middleware: `auth:api`

---

## Endpoints

### GET /api/v1/dashboard/summary

**Response 200:**
```json
{
  "metrics": {
    "monthly_sales": {
      "total": 15000.00,
      "count": 42
    },
    "monthly_patients": {
      "count": 18
    },
    "lab_orders": {
      "total": 25,
      "pending": 7
    },
    "pending_balance": {
      "total": 3500.00
    }
  },
  "weekly_sales": [
    {
      "label": "Lun",
      "total": 2000.00,
      "height_pct": 75,
      "is_current": false
    },
    {
      "label": "Mar",
      "total": 1500.00,
      "height_pct": 56,
      "is_current": false
    },
    {
      "label": "Mié",
      "total": 2700.00,
      "height_pct": 100,
      "is_current": true
    }
    // ... up to 7 days (Mon–Sun current week)
  ],
  "recent_orders": [
    {
      "id": 1,
      "patient": "Nombre del paciente",
      "product": "Nombre del producto",
      "status": "pending | processing | ready | delivered",
      "total": 350.00
    }
    // ... last 5–10 orders
  ]
}
```

**Note:** `height_pct` is a percentage (0–100) calculated relative to the day with highest sales that week. `is_current` marks the current day of the week.
