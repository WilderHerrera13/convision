# Coding Conventions
_Generated: 2026-04-13_

## Summary
Convision is a monorepo with two distinct codebases: a Laravel 8 PHP API (`convision-api/`) and a React 18 TypeScript SPA (`convision-front/`). Each follows well-defined layered conventions. The backend enforces a strict controller→service→model flow; the frontend enforces a service→React Query→component flow. All user-facing text must be in Spanish.

---

## Backend Conventions (Laravel)

### Naming Patterns

**Controllers:**
- Location: `app/Http/Controllers/Api/V1/{EntityName}Controller.php`
- Class name: `{EntityName}Controller` (PascalCase)
- Methods: `index`, `show`, `store`, `update`, `destroy` (RESTful names only)
- Additional actions: named descriptively, e.g. `restore`, `uploadProfileImage`, `updateStatus`

**Form Requests:**
- Location: `app/Http/Requests/Api/V1/{Entity}/{Action}{Entity}Request.php`
- Examples: `StorePatientRequest`, `UpdatePatientRequest`, `StoreServiceOrderRequest`
- Always extend `Illuminate\Foundation\Http\FormRequest`
- `authorize()` always returns `true`; authorization handled by middleware
- All validation rules defined in `rules()`

**Resources:**
- Location: `app/Http/Resources/V1/{Category}/{Entity}Resource.php` and `{Entity}Collection.php`
- Single resource: `{Entity}Resource extends JsonResource`
- Paginated list: `{Entity}Collection extends ResourceCollection`
- Always implement `toArray($request)` explicitly; never rely on default resource output

**Services:**
- Location: `app/Services/{Entity}Service.php`
- Method naming: `createEntity`, `updateEntity`, `deleteEntity`, `findEntity`, `restoreEntity`
- Accept typed PHP objects/models, not raw request objects
- Return typed model instances

**Models:**
- Location: `app/Models/{EntityName}.php`
- Must declare `protected $fillable` array
- Must use `HasFactory` trait
- Soft-deletable models use `SoftDeletes` trait
- Filterable models use `ApiFilterable` trait (see `app/Traits/ApiFilterable.php`)
- Relationships: `belongsTo`, `hasMany`, etc. as named methods in camelCase

**Migrations/Factories/Seeders:**
- Every new model requires a migration, factory, and seeder entry

### Controller Pattern

The index action always caps pagination:
```php
public function index(Request $request)
{
    $query = Model::with(['relation1', 'relation2'])->apiFilter($request);
    $perPage = min(max(1, (int)$request->get('per_page', 15)), 100);
    return new ModelCollection($query->paginate($perPage));
}
```

The store action delegates to service:
```php
public function store(StoreModelRequest $request)
{
    $validatedData = $request->validated();
    $entity = $this->entityService->createEntity($validatedData);
    return new EntityResource($entity);
}
```

The destroy action returns 204:
```php
public function destroy(Model $model)
{
    $this->entityService->deleteEntity($model);
    return response()->json(null, 204);
}
```

### Strict Rules
- **Never** use `response()->json()` for data responses — always use API Resources. (Exception: `null, 204` for destroys, and stats/calculation endpoints that return raw arrays.)
- **Never** validate in controllers via `$request->validate()` — use Form Request classes. (Several controllers break this rule: `ServiceOrderController::updateStatus`, `AppointmentController`, `CashTransferController`, `PurchaseController` — see Concerns.)
- Use `$request->validated()` after Form Request, never `$request->all()`
- Always eager-load relationships in index/show to avoid N+1

### Service Pattern
Services wrap all business logic, transactions, and side effects:
```php
public function createEntity(array $validatedData): Entity
{
    DB::beginTransaction();
    try {
        $entity = Entity::create($validatedData);
        DB::commit();
        return $entity;
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error creating entity: ' . $e->getMessage(), [...]);
        throw $e;
    }
}
```

### ApiFilterable Trait
Used by any model that needs list filtering. Controllers call `Model::apiFilter($request)`.

Frontend sends:
- `s_f` — JSON array of field names
- `s_v` — JSON array of corresponding values
- `s_o` — operator: `and` (default) or `or`
- `sort` — `column,direction`
- `status` — direct status filter (bypasses s_f/s_v)

ID fields (`*_id`) use exact match; text fields use `LIKE %value%`.

### Logging (Backend)
- Use `Illuminate\Support\Facades\Log`
- Log errors in service catch blocks: `Log::error('Error doing X: ' . $e->getMessage(), ['context' => ...])`
- Debug logs sprinkled throughout `ApiFilterable` (can be noisy in production)

---

## Frontend Conventions (React/TypeScript)

### Naming Patterns

**Files:**
- Pages: PascalCase, `{EntityName}.tsx` — e.g. `Patients.tsx`, `ServiceOrders.tsx`
- Multi-word pages: PascalCase — e.g. `LaboratoryOrders.tsx`, `NewPurchase.tsx`
- Services: camelCase with `Service` suffix — e.g. `patientService.ts`, `serviceOrderService.ts`
- Utility modules: camelCase — e.g. `utils.ts`, `axios.ts`
- Hooks: camelCase with `use` prefix — e.g. `useDebounce.ts`, `use-toast.ts`

**Components:**
- PascalCase function component with `React.FC` annotation: `const ServiceOrders: React.FC = () => {`
- Props interface: `interface {ComponentName}Props { ... }`
- Named exports for utilities/hooks; default exports for pages

**Variables/Functions:**
- camelCase for variables and functions
- PascalCase for TypeScript interfaces and types
- `snake_case` for API payload keys (matching backend)

### Code Style

**Linting:**
- ESLint with TypeScript support (`typescript-eslint`)
- `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- `@typescript-eslint/no-unused-vars` is **disabled** (set to `"off"`)
- Config: `convision-front/eslint.config.js`

**No Prettier config detected** — formatting is not enforced programmatically.

### Import Organization

Consistent pattern observed across pages:
1. React and React Router imports
2. React Query (`@tanstack/react-query`)
3. UI components from `@/components/ui/...` (shadcn-ui components)
4. lucide-react icons
5. Service imports from `@/services/...`
6. Context imports (`@/contexts/AuthContext`)
7. Type imports

**Path aliases:**
- `@/` maps to `src/` (configured in `vite.config.ts`)

### Component Structure

Pages follow this pattern:
```tsx
const PageName: React.FC = () => {
  // 1. Hooks (useNavigate, useAuth, useQueryClient, useToast)
  // 2. Local state (useState)
  // 3. React Query queries (useQuery)
  // 4. React Query mutations (useMutation)
  // 5. Handler functions
  // 6. JSX return
};

export default PageName;
```

### State Management

- **Server state**: React Query (`@tanstack/react-query`) — always use `useQuery` for fetches, `useMutation` for writes
- **Local UI state**: `useState` within the component
- **Auth state**: `AuthContext` — consume via `useAuth()` hook from `@/contexts/AuthContext`
- **No global client state manager** (no Redux, Zustand, etc.)

Query key naming:
- Use kebab-case string arrays: `['service-orders', searchTerm, statusFilter]`
- Invalidate with prefix match: `queryClient.invalidateQueries({ queryKey: ['service-orders'] })`

### Form Pattern

All forms use React Hook Form + Zod:
```tsx
// 1. Define schema above the component
const entitySchema = z.object({
  field: z.string().min(2, "El campo debe tener al menos 2 caracteres"),
  // ... all validation messages in Spanish
});

type EntityFormValues = z.infer<typeof entitySchema>;

// 2. Inside component
const form = useForm<EntityFormValues>({
  resolver: zodResolver(entitySchema),
  defaultValues: { ... },
});

// 3. Submit handler
const onSubmit = (values: EntityFormValues) => {
  createMutation.mutate(values);
};
```

### Service Layer

- All API calls go in `src/services/{entity}Service.ts` — never call axios directly in components
- Services are class instances exported as singletons: `export const patientService = new PatientService();`
- The axios instance is at `src/lib/axios.ts` — includes JWT token injection and 401 token refresh interceptor
- **Violation**: 11 page files import `api from '@/lib/axios'` directly and bypass the service layer (see Concerns)

### Error Handling (Frontend)

Mutations use `onSuccess`/`onError` callbacks:
```tsx
useMutation({
  mutationFn: serviceMethod,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity'] });
    toast({ title: 'Éxito', description: 'Mensaje en español.' });
  },
  onError: (error: Error | { response?: { data?: { message?: string } } }) => {
    const errorMessage = error instanceof Error
      ? error.message
      : error.response?.data?.message || 'Mensaje de error genérico.';
    toast({ variant: 'destructive', title: 'Error', description: errorMessage });
  },
});
```

### Toast Notifications

Two import patterns exist (inconsistency):
- `import { useToast } from "@/components/ui/use-toast"` — used in most admin pages
- `import { useToast } from '@/hooks/use-toast'` — used in newer pages like `ServiceOrders.tsx`

Both resolve to the same underlying Radix toast. Prefer `@/hooks/use-toast`.

### Styling

- Tailwind CSS exclusively — no inline styles, no separate CSS files
- `cn()` utility from `src/lib/utils.ts` for conditional class merging (`clsx` + `tailwind-merge`)
- shadcn-ui component library — all primitive UI from `src/components/ui/`

### Table Pattern

All tabular data must use `DataTable` or `EntityTable`:
```tsx
import { DataTable, DataTableColumnDef } from '@/components/ui/data-table';

const columns: DataTableColumnDef<EntityType>[] = [
  { id: 'field', header: 'Encabezado', accessorKey: 'field', type: 'text' },
  { id: 'amount', header: 'Monto', accessorKey: 'amount', type: 'money' },
  { id: 'actions', header: 'Acciones', type: 'actions', actions: [...] },
];
```

Column types: `'text' | 'number' | 'date' | 'datetime' | 'money' | 'boolean' | 'status' | 'actions' | 'custom'`

### Date Handling

- Use `DatePicker` component from `@/components/ui/date-picker` — never build custom date pickers
- Format dates with `formatDate()` from `@/lib/utils.ts` (returns `DD/MM/YYYY`)
- Format datetimes with `safeDateFormat()` from `@/lib/utils.ts`
- Currency formatted with `formatCurrency(amount, 'COP')` using `es-CO` locale

### Language Rule

All user-facing text must be in Spanish. Validation messages, toast notifications, labels, placeholders, and error messages must all be in Spanish. English is only used in code identifiers (variable names, function names, type names) and code comments.

---

## Gaps / Unknowns

- No Prettier config found — formatting consistency is not enforced by tooling
- `@typescript-eslint/no-unused-vars` is disabled, masking dead code
- No shared TypeScript interface library between service files and page files — types are often redefined locally in pages (e.g. `Patient` type redefined in `Patients.tsx` separately from `src/services/patientService.ts`)
- The two axios instances (`src/lib/axios.ts` and `src/services/api.ts`) appear to overlap in purpose — which is canonical is not clear
