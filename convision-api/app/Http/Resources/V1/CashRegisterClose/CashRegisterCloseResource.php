<?php

namespace App\Http\Resources\V1\CashRegisterClose;

use Illuminate\Http\Resources\Json\JsonResource;

class CashRegisterCloseResource extends JsonResource
{
    public function toArray($request): array
    {
        $isAdmin = $request->user() && $request->user()->role === 'admin';

        $data = [
            'id' => $this->id,
            'close_date' => $this->close_date?->format('Y-m-d'),
            'status' => $this->status,
            'total_counted' => $this->total_counted,
            'admin_notes' => $this->admin_notes,
            'advisor_notes' => $this->advisor_notes,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'user' => $this->when($this->relationLoaded('user'), fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'last_name' => $this->user->last_name,
            ]),
            'approved_by' => $this->whenLoaded('approvedBy', fn () => [
                'id' => $this->approvedBy->id,
                'name' => $this->approvedBy->name,
            ]),
            'payment_methods' => CashRegisterClosePaymentResource::collection($this->whenLoaded('payments')),
            'denominations' => CashCountDenominationResource::collection($this->whenLoaded('denominations')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];

        if ($isAdmin) {
            $data = array_merge($data, $this->adminOnlyPayload());
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    protected function adminOnlyPayload(): array
    {
        $hasActuals = $this->admin_actuals_recorded_at !== null;
        $adminTotal = $hasActuals ? (float) $this->total_actual_amount : null;
        $advisorTotal = (float) $this->total_counted;
        $varianceTotal = $hasActuals
            ? round($advisorTotal - (float) $this->total_actual_amount, 2)
            : null;

        $payload = [
            'total_actual_amount' => $hasActuals ? $adminTotal : null,
            'admin_actuals_recorded_at' => $this->admin_actuals_recorded_at?->toIso8601String(),
            'reconciliation' => [
                'totals' => [
                    'advisor_total' => $advisorTotal,
                    'admin_total' => $adminTotal,
                    'variance_total' => $varianceTotal,
                ],
                'recorded_at' => $this->admin_actuals_recorded_at?->toIso8601String(),
                'payment_methods' => null,
            ],
        ];

        if ($this->relationLoaded('payments') && $this->relationLoaded('actualPayments')) {
            $payload['reconciliation']['payment_methods'] = $this->buildReconciliationRows();
        }

        return $payload;
    }

    /**
     * @return array<int, array{name: string, advisor_counted: float, admin_actual: float, variance: float}>
     */
    protected function buildReconciliationRows(): array
    {
        $actualsByName = $this->actualPayments->keyBy('payment_method_name');
        $rows = [];

        foreach ($this->payments as $p) {
            $name = $p->payment_method_name;
            $counted = (float) $p->counted_amount;
            $row = $actualsByName->get($name);
            $actual = $row ? (float) $row->actual_amount : 0.0;
            $rows[] = [
                'name' => $name,
                'advisor_counted' => $counted,
                'admin_actual' => $actual,
                'variance' => round($counted - $actual, 2),
            ];
        }

        return $rows;
    }
}
