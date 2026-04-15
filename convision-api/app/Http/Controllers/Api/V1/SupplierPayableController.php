<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\ServiceOrder;
use Illuminate\Http\Request;

class SupplierPayableController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $perPage = min(max(1, (int) $request->get('per_page', 15)), 100);
        $page = max(1, (int) $request->get('page', 1));

        $search = $request->get('search');
        $supplierId = $request->get('supplier_id');
        $status = $request->get('status'); // pending | overdue | paid

        $items = [];

        $purchaseQuery = Purchase::with('supplier')
            ->when($supplierId, function ($q) use ($supplierId) {
                return $q->where('supplier_id', $supplierId);
            })
            ->when($search, function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('invoice_number', 'like', "%$search%")
                       ->orWhereHas('supplier', function ($s) use ($search) {
                           $s->where('name', 'like', "%$search%");
                       });
                });
            });

        foreach ($purchaseQuery->get() as $p) {
            $derivedStatus = $p->balance <= 0 ? 'paid' : (($p->payment_due_date && $p->payment_due_date < now() && $p->payment_status !== 'paid') ? 'overdue' : 'pending');
            if ($status && $status !== $derivedStatus) continue;
            $items[] = [
                'source' => 'purchase',
                'source_id' => $p->id,
                'supplier' => [ 'id' => $p->supplier ? $p->supplier->id : null, 'name' => $p->supplier ? $p->supplier->name : null ],
                'reference' => $p->invoice_number,
                'due_date' => optional($p->payment_due_date)->format('Y-m-d'),
                'amount_total' => (float) $p->total_amount,
                'amount_paid' => (float) $p->payment_amount,
                'balance' => (float) $p->balance,
                'status' => $derivedStatus,
            ];
        }

        $expenseQuery = Expense::with('supplier')
            ->when($supplierId, function ($q) use ($supplierId) {
                return $q->where('supplier_id', $supplierId);
            })
            ->when($search, function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('invoice_number', 'like', "%$search%")
                       ->orWhere('concept', 'like', "%$search%")
                       ->orWhereHas('supplier', function ($s) use ($search) {
                           $s->where('name', 'like', "%$search%");
                       });
                });
            });

        foreach ($expenseQuery->get() as $e) {
            $derivedStatus = $e->balance <= 0 ? 'paid' : 'pending';
            if ($status && $status !== $derivedStatus) continue;
            $items[] = [
                'source' => 'expense',
                'source_id' => $e->id,
                'supplier' => [ 'id' => $e->supplier ? $e->supplier->id : null, 'name' => $e->supplier ? $e->supplier->name : null ],
                'reference' => $e->invoice_number,
                'due_date' => null,
                'amount_total' => (float) $e->amount,
                'amount_paid' => (float) $e->payment_amount,
                'balance' => (float) $e->balance,
                'status' => $derivedStatus,
            ];
        }

        // Service Orders (repair orders) as payables to suppliers
        $serviceOrderQuery = ServiceOrder::with('supplier')
            ->when($supplierId, function ($q) use ($supplierId) {
                return $q->where('supplier_id', $supplierId);
            })
            ->when($search, function ($q) use ($search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('order_number', 'like', "%$search%")
                       ->orWhere('service_type', 'like', "%$search%")
                       ->orWhereHas('supplier', function ($s) use ($search) {
                           $s->where('name', 'like', "%$search%");
                       });
                });
            });

        foreach ($serviceOrderQuery->get() as $so) {
            $amountTotal = (float) ($so->final_cost ?? $so->estimated_cost ?? 0);
            $amountPaid = (float) 0; // If there is a specific payments table, wire it here
            $balance = max(0.0, $amountTotal - $amountPaid);
            $derivedStatus = $balance <= 0 ? 'paid' : 'pending';
            if ($status && $status !== $derivedStatus) continue;
            $items[] = [
                'source' => 'service_order',
                'source_id' => $so->id,
                'supplier' => [ 'id' => $so->supplier ? $so->supplier->id : null, 'name' => $so->supplier ? $so->supplier->name : null ],
                'reference' => $so->order_number,
                'due_date' => optional($so->estimated_delivery_date)->format('Y-m-d'),
                'amount_total' => $amountTotal,
                'amount_paid' => $amountPaid,
                'balance' => $balance,
                'status' => $derivedStatus,
            ];
        }

        // Simple manual pagination for merged results
        $total = count($items);
        usort($items, function ($a, $b) {
            $bd = isset($b['due_date']) ? (string)$b['due_date'] : '';
            $ad = isset($a['due_date']) ? (string)$a['due_date'] : '';
            return strcmp($bd, $ad);
        });
        $items = array_values($items);
        $paged = array_slice($items, ($page - 1) * $perPage, $perPage);

        return response()->json([
            'data' => $paged,
            'current_page' => $page,
            'per_page' => $perPage,
            'last_page' => (int) ceil($total / $perPage),
            'total' => $total,
        ]);
    }
}


