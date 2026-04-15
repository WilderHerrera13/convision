<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\Patient;
use App\Models\LaboratoryOrder;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function summary(Request $request)
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $startOfPrevMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfPrevMonth = $now->copy()->subMonth()->endOfMonth();

        $monthlySales = Sale::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->sum('total');

        $prevMonthlySales = Sale::whereBetween('created_at', [$startOfPrevMonth, $endOfPrevMonth])
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->sum('total');

        $salesChange = $prevMonthlySales > 0
            ? round((($monthlySales - $prevMonthlySales) / $prevMonthlySales) * 100, 1)
            : null;

        $monthlyPatients = Appointment::whereBetween('scheduled_at', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->distinct('patient_id')
            ->count('patient_id');

        $prevMonthlyPatients = Appointment::whereBetween('scheduled_at', [$startOfPrevMonth, $endOfPrevMonth])
            ->where('status', 'completed')
            ->distinct('patient_id')
            ->count('patient_id');

        $patientsChange = $prevMonthlyPatients > 0
            ? round((($monthlyPatients - $prevMonthlyPatients) / $prevMonthlyPatients) * 100, 1)
            : null;

        $labOrdersTotal = LaboratoryOrder::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->count();

        $labOrdersPending = LaboratoryOrder::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->whereIn('status', ['pending', 'in_process', 'sent_to_lab'])
            ->count();

        $pendingBalance = Sale::whereIn('payment_status', ['partial', 'pending'])
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->sum('balance');

        $pendingBalanceCount = Sale::whereIn('payment_status', ['partial', 'pending'])
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->count();

        $weeklySales = $this->getWeeklySalesCurrentMonth($now);

        $recentOrders = Sale::with(['patient', 'items.lens'])
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($sale) {
                $firstItem = $sale->items->first();
                $product = $firstItem
                    ? ($firstItem->lens ? ($firstItem->lens->description ?? $firstItem->lens->identifier ?? 'Producto') : 'Producto')
                    : 'Producto';
                $statusMap = [
                    'completed' => 'Listo',
                    'paid' => 'Listo',
                    'pending' => 'Cotizado',
                    'partially_paid' => 'En lab.',
                ];
                return [
                    'id' => $sale->id,
                    'patient' => $sale->patient
                        ? $sale->patient->first_name . ' ' . $sale->patient->last_name
                        : 'N/A',
                    'product' => $product,
                    'status' => $statusMap[$sale->status] ?? 'Cotizado',
                    'total' => $sale->total,
                ];
            });

        return response()->json([
            'metrics' => [
                'monthly_sales' => $monthlySales,
                'monthly_sales_change' => $salesChange,
                'monthly_patients' => $monthlyPatients,
                'monthly_patients_change' => $patientsChange,
                'lab_orders_total' => $labOrdersTotal,
                'lab_orders_pending' => $labOrdersPending,
                'pending_balance' => $pendingBalance,
                'pending_balance_count' => $pendingBalanceCount,
            ],
            'weekly_sales' => $weeklySales,
            'recent_orders' => $recentOrders,
        ]);
    }

    private function getWeeklySalesCurrentMonth(Carbon $now): array
    {
        $startOfMonth = $now->copy()->startOfMonth();
        $weeksData = [];

        for ($week = 1; $week <= 5; $week++) {
            $weekStart = $startOfMonth->copy()->addDays(($week - 1) * 7);
            $weekEnd = $weekStart->copy()->addDays(6)->endOfDay();

            if ($weekStart->month !== $now->month) {
                break;
            }

            $total = Sale::whereBetween('created_at', [$weekStart, $weekEnd])
                ->whereNotIn('status', ['cancelled', 'refunded'])
                ->sum('total');

            $weeksData[] = [
                'label' => 'S' . $week,
                'total' => (float) $total,
                'is_current' => $now->between($weekStart, $weekEnd),
            ];
        }

        $maxTotal = collect($weeksData)->max('total');

        return collect($weeksData)->map(function ($week) use ($maxTotal) {
            return [
                'label' => $week['label'],
                'total' => $week['total'],
                'height_pct' => $maxTotal > 0 ? round(($week['total'] / $maxTotal) * 100) : 0,
                'is_current' => $week['is_current'],
            ];
        })->toArray();
    }
}
