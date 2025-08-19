<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Expense\StoreExpenseRequest;
use App\Http\Requests\Api\V1\Expense\UpdateExpenseRequest;
use App\Http\Resources\V1\Expense\ExpenseCollection;
use App\Http\Resources\V1\Expense\ExpenseResource;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    protected $expenseService;

    public function __construct(ExpenseService $expenseService)
    {
        $this->middleware('auth:api');
        $this->expenseService = $expenseService;
    }

    public function index(Request $request)
    {
        $query = Expense::with(['supplier', 'paymentMethod', 'createdBy'])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $expenses = $query->paginate($perPage);
        
        return new ExpenseCollection($expenses);
    }

    public function store(StoreExpenseRequest $request)
    {
        $validatedData = $request->validated();
        $expense = $this->expenseService->createExpense($validatedData);
        return new ExpenseResource($expense);
    }

    public function show(Expense $expense)
    {
        $expense->load(['supplier', 'paymentMethod', 'createdBy']);
        return new ExpenseResource($expense);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense)
    {
        $validatedData = $request->validated();
        $expense = $this->expenseService->updateExpense($expense, $validatedData);
        return new ExpenseResource($expense);
    }

    public function destroy(Expense $expense)
    {
        $this->expenseService->deleteExpense($expense);
        return response()->json(null, 204);
    }

    public function addPayment(Request $request, Expense $expense)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01|max:' . $expense->balance,
            'notes' => 'nullable|string',
        ]);

        $expense = $this->expenseService->addPayment($expense, $request->validated());
        
        return response()->json([
            'message' => 'Pago agregado exitosamente',
            'expense' => new ExpenseResource($expense),
        ]);
    }

    public function stats(Request $request)
    {
        $stats = $this->expenseService->getExpenseStats();
        return response()->json($stats);
    }
} 