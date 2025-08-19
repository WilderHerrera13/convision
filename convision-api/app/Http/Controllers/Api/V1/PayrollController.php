<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Payroll\StorePayrollRequest;
use App\Http\Requests\Api\V1\Payroll\UpdatePayrollRequest;
use App\Http\Resources\V1\Payroll\PayrollCollection;
use App\Http\Resources\V1\Payroll\PayrollResource;
use App\Models\Payroll;
use App\Services\PayrollService;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    protected $payrollService;

    public function __construct(PayrollService $payrollService)
    {
        $this->middleware('auth:api');
        $this->payrollService = $payrollService;
    }

    public function index(Request $request)
    {
        $query = Payroll::with(['paymentMethod', 'createdBy'])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $payrolls = $query->paginate($perPage);
        
        return new PayrollCollection($payrolls);
    }

    public function store(StorePayrollRequest $request)
    {
        $validatedData = $request->validated();
        $payroll = $this->payrollService->createPayroll($validatedData);
        return new PayrollResource($payroll);
    }

    public function show(Payroll $payroll)
    {
        $payroll->load(['paymentMethod', 'createdBy']);
        return new PayrollResource($payroll);
    }

    public function update(UpdatePayrollRequest $request, Payroll $payroll)
    {
        $validatedData = $request->validated();
        $payroll = $this->payrollService->updatePayroll($payroll, $validatedData);
        return new PayrollResource($payroll);
    }

    public function destroy(Payroll $payroll)
    {
        $this->payrollService->deletePayroll($payroll);
        return response()->json(null, 204);
    }

    public function stats(Request $request)
    {
        $stats = $this->payrollService->getPayrollStats();
        return response()->json($stats);
    }

    public function calculatePayroll(Request $request)
    {
        $validated = $request->validate([
            'base_salary' => 'required|numeric|min:0',
            'overtime_hours' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|numeric|min:0',
            'bonuses' => 'nullable|numeric|min:0',
            'commissions' => 'nullable|numeric|min:0',
            'other_income' => 'nullable|numeric|min:0',
            'health_deduction' => 'nullable|numeric|min:0',
            'pension_deduction' => 'nullable|numeric|min:0',
            'tax_deduction' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
        ]);

        $calculations = $this->payrollService->calculatePayroll($validated);
        
        return response()->json($calculations);
    }
} 