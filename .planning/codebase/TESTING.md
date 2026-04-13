# Testing Patterns
_Generated: 2026-04-13_

## Summary
Testing exists only in the Laravel backend. There are no tests in the React frontend. Backend test coverage is sparse: only 6 entities (Auth, Patient, Appointment, User, ClinicalHistory, ClinicalEvolution) have feature tests, and only 2 unit test files exist. The majority of controllers, services, and models have no test coverage.

---

## Backend Testing (Laravel / PHPUnit)

### Test Framework

**Runner:** PHPUnit (Laravel's built-in test runner)
- Config: `convision-api/phpunit.xml`
- Bootstrap: `vendor/autoload.php`

**Run Commands:**
```bash
# From convision-api/
php artisan test                        # Run all tests
php artisan test tests/Feature/Api/V1/PatientControllerTest.php  # Single file
php artisan test --filter test_can_list_patients                  # Single test
```

**Test Environment:**
- `APP_ENV=testing`
- `CACHE_DRIVER=array`
- `QUEUE_CONNECTION=sync`
- `SESSION_DRIVER=array`
- Database: **NOT configured for SQLite in-memory** (lines are commented out in `phpunit.xml`) — tests run against the actual configured database. This means `RefreshDatabase` will wipe a real database.

### Test File Organization

**Location pattern:**
- Feature tests: `tests/Feature/Api/V1/{Entity}ControllerTest.php`
- Unit tests: `tests/Unit/{Subject}Test.php` or `tests/Unit/Services/{ServiceName}Test.php`
- Base test case: `tests/TestCase.php` (extends `Illuminate\Foundation\Testing\TestCase`)

**Current test files:**
```
tests/
├── TestCase.php
├── CreatesApplication.php
├── Feature/
│   ├── ExampleTest.php
│   └── Api/V1/
│       ├── AuthControllerTest.php
│       ├── PatientControllerTest.php
│       ├── AppointmentControllerTest.php
│       ├── UserControllerTest.php
│       ├── ClinicalHistoryControllerTest.php
│       └── ClinicalEvolutionControllerTest.php
└── Unit/
    ├── ExampleTest.php
    ├── PrescriptionObserverTest.php
    └── Services/
        └── ProductImportServiceTest.php
```

### Test Structure

Feature tests use `RefreshDatabase` and `WithFaker` traits:
```php
class PatientControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function getAuthToken(...)
    {
        $user = User::factory()->create([...]);
        $response = $this->postJson('/api/v1/auth/login', [...]);
        return $response->json('access_token');
    }

    public function test_can_list_patients()
    {
        $token = $this->getAuthToken();
        Patient::factory()->count(3)->create();

        $response = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
                         ->getJson('/api/v1/patients');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
        $response->assertJsonStructure([
            'data' => ['*' => ['id', 'first_name', ...]],
            'links' => [...],
            'meta' => [...],
        ]);
    }
}
```

**Test method naming:** `test_can_{verb}_{entity}` (snake_case, `test_` prefix)

### Authentication in Tests

Every feature test file duplicates the same `getAuthToken()` or `authenticateUser()` helper method — there is no shared trait or base class providing this. The helper:
1. Creates a `User` via factory
2. Posts to `/api/v1/auth/login` with a verbose payload (many null/false fields required by the auth endpoint)
3. Returns the `access_token` from the response

```php
protected function getAuthToken($email = 'testuser@example.com', $password = 'password')
{
    $user = User::factory()->create(['email' => $email, 'password' => bcrypt($password)]);
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $email, 'password' => $password,
        'newPassword' => null, 'confirmNewPassword' => null,
        'verificationCode' => null, 'forgotPasswordFlg' => false,
        'confirmForgotPasswordFlg' => false, 'newPasswordFlg' => false,
        'verifyEmailFlg' => false,
    ]);
    return $response->json('access_token');
}
```

### Assertions Pattern

Feature tests assert:
- HTTP status codes: `assertStatus(200)`, `assertStatus(201)`, `assertStatus(204)`
- JSON structure: `assertJsonStructure([...])`
- JSON values: `assertJson(['data' => ['email' => $patient->email]])`
- Database state: `assertDatabaseHas('patients', [...])`, `assertSoftDeleted('patients', [...])`

### Mocking (Unit Tests)

Unit tests use Laravel's Mockery integration via `$this->mock()` and `$this->partialMock()`:
```php
$this->productImportService = $this->partialMock(ProductImportService::class, function ($mock) {
    $mock->shouldReceive('getOrCreateBrand')->andReturn((object)['id' => 1]);
    // ...
});
```

Private/protected method testing uses PHP Reflection:
```php
$reflection = new \ReflectionClass($this->productImportService);
$method = $reflection->getMethod('normalizeHeaders');
$method->setAccessible(true);
$result = $method->invoke($this->productImportService, $headers);
```

### Factories

Available factories (only 6 of ~55 models have factories):
- `UserFactory` — `tests/Feature` and `tests/Unit` both use it
- `PatientFactory`
- `AppointmentFactory`
- `ClinicalEvolutionFactory`
- `ClinicalHistoryFactory`
- `IdentificationTypeFactory`

Location: `convision-api/database/factories/`

Most models (e.g. `Sale`, `Purchase`, `LaboratoryOrder`, `Expense`, `ServiceOrder`) have **no factory**, making it very difficult to write tests for them.

### Coverage

**Configuration:** `phpunit.xml` configures coverage to include all files in `./app` with `processUncoveredFiles=true`.

**View Coverage:**
```bash
php artisan test --coverage
```

**Estimated coverage state:** Very low. Only 6 of ~45 controllers have any test coverage. No coverage for services beyond `ProductImportService`. No coverage for:
- All financial controllers (Sales, Purchases, Expenses, Payrolls, LaboratoryOrders, ServiceOrders, etc.)
- Most services
- All API Resources
- All Form Requests (validation rules untested)
- Models and their relationships

---

## Frontend Testing

**No test framework is configured.** There are no test files (`*.test.*`, `*.spec.*`) anywhere in `convision-front/`. No testing library (Vitest, Jest, React Testing Library, Playwright, Cypress) is listed in `package.json`.

---

## Gaps / Unknowns

**Critical gaps:**
- SQLite in-memory database not configured (`phpunit.xml` has those lines commented out), meaning `RefreshDatabase` runs against the real database — dangerous in shared or production-like environments
- No frontend tests at all
- Only 6 factories for ~55 models — blocks writing tests for the majority of the codebase
- Auth helper is copy-pasted across every test file — should be extracted to a base `ApiTestCase` trait
- Role-based access control is not tested anywhere (no tests verify that non-admin users cannot access admin-only endpoints)
- Validation rules in Form Request classes have no dedicated tests
- No test for `ApiFilterable` trait behavior (filter, sort, pagination edge cases)

**Unknown:**
- Whether a CI pipeline runs tests automatically (no CI config file detected in the repository root or `convision-api/`)
- Whether test coverage is tracked or enforced anywhere
