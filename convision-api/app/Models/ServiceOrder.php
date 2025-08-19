<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class ServiceOrder extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'order_number',
        'supplier_id',
        'service_type',
        'description',
        'lens_horizontal_axis',
        'lens_vertical_axis',
        'lens_distance',
        'estimated_cost',
        'final_cost',
        'estimated_delivery_date',
        'actual_delivery_date',
        'status',
        'observations',
        'created_by_user_id',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
        'final_cost' => 'decimal:2',
        'estimated_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
        'lens_horizontal_axis' => 'decimal:2',
        'lens_vertical_axis' => 'decimal:2',
        'lens_distance' => 'decimal:2',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function getStatusBadgeAttribute()
    {
        switch ($this->status) {
            case 'pending':
                return 'warning';
            case 'in_progress':
                return 'info';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'destructive';
            default:
                return 'default';
        }
    }
} 