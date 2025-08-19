<?php

namespace App\Services;

use App\Models\Payroll;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PayrollService
{
    public function createPayroll(array $data): Payroll
    {
        return DB::transaction(function () use ($data) {
            $data['created_by_user_id'] = Auth::id();
            
            $calculations = $this->calculatePayroll($data);
            $data = array_merge($data, $calculations);
            
            $payroll = Payroll::create($data);
            
            return $payroll->load(['paymentMethod', 'createdBy']);
        });
    }

    public function updatePayroll(Payroll $payroll, array $data): Payroll
    {
        return DB::transaction(function () use ($payroll, $data) {
            $calculations = $this->calculatePayroll($data);
            $data = array_merge($data, $calculations);
            
            $payroll->update($data);
            
            return $payroll->load(['paymentMethod', 'createdBy']);
        });
    }

    public function deletePayroll(Payroll $payroll): bool
    {
        return $payroll->delete();
    }

    public function calculatePayroll(array $data): array
    {
        $baseSalary = $data['base_salary'] ?? 0;
        $overtimeHours = $data['overtime_hours'] ?? 0;
        $overtimeRate = $data['overtime_rate'] ?? 0;
        $bonuses = $data['bonuses'] ?? 0;
        $commissions = $data['commissions'] ?? 0;
        $otherIncome = $data['other_income'] ?? 0;
        
        $overtimeAmount = $overtimeHours * $overtimeRate;
        $grossSalary = $baseSalary + $overtimeAmount + $bonuses + $commissions + $otherIncome;
        
        $healthDeduction = $data['health_deduction'] ?? 0;
        $pensionDeduction = $data['pension_deduction'] ?? 0;
        $taxDeduction = $data['tax_deduction'] ?? 0;
        $otherDeductions = $data['other_deductions'] ?? 0;
        
        $totalDeductions = $healthDeduction + $pensionDeduction + $taxDeduction + $otherDeductions;
        $netSalary = $grossSalary - $totalDeductions;
        
        return [
            'overtime_amount' => round($overtimeAmount, 2),
            'gross_salary' => round($grossSalary, 2),
            'total_deductions' => round($totalDeductions, 2),
            'net_salary' => round($netSalary, 2),
        ];
    }

    public function getPayrollStats(): array
    {
        $totalGross = Payroll::sum('gross_salary');
        $totalNet = Payroll::sum('net_salary');
        $totalDeductions = Payroll::sum('total_deductions');
        $count = Payroll::count();
        $paidCount = Payroll::where('status', 'paid')->count();
        $pendingCount = Payroll::where('status', 'pending')->count();

        return [
            'total_gross_salary' => round($totalGross, 2),
            'total_net_salary' => round($totalNet, 2),
            'total_deductions' => round($totalDeductions, 2),
            'total_count' => $count,
            'paid_count' => $paidCount,
            'pending_count' => $pendingCount,
        ];
    }
} 