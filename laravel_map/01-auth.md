# 01 — Authentication

## Source files
- Controller: `app/Http/Controllers/Api/V1/AuthController.php`
- Request: `app/Http/Requests/Api/V1/Auth/LoginRequest.php`
- Resource: `app/Http/Resources/V1/User/UserResource.php`
- Model: `app/Models/User.php`

---

## Endpoints

### POST /api/v1/auth/login
**Auth required:** No

**Request body:**
```json
{
  "email": "admin@convision.com",   // required|email
  "password": "password"            // required|string
}
```

**Response 200:**
```json
{
  "access_token": "<jwt_string>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "name": "Carlos",
    "last_name": "Vargas",
    "email": "admin@convision.com",
    "identification": "123456789",
    "phone": "3001234567",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

**Response 401:** `{"error":"Unauthorized"}`
**Response 422:** Validation errors envelope

---

### POST /api/v1/auth/logout
**Auth required:** Yes (`jwt.auth`)

**Request body:** none

**Response 200:**
```json
{ "message": "Successfully logged out" }
```

---

### GET /api/v1/auth/me
**Auth required:** Yes (`jwt.auth`)

**Response 200:** UserResource object (same as `user` field in login response)

---

### POST /api/v1/auth/refresh
**Auth required:** Token in header (even if expired, lib handles it)

**Request body:** none

**Response 200:** Same shape as login response (new token + user)

---

## UserResource shape
```json
{
  "id": 1,
  "name": "string",
  "last_name": "string",
  "email": "string",
  "identification": "string",
  "phone": "string",
  "role": "admin | specialist | receptionist | laboratory",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## JWT Implementation notes
- JWT custom claim: `{ "role": "<user_role>" }` — include in token payload
- `expires_in` value = TTL in seconds
- Golang: use `golang-jwt/jwt`, sign with HS256 and `JWT_SECRET` env var
- Refresh: invalidate old token, issue new one with new expiry
