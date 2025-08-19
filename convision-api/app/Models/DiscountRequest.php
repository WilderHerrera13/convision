<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ApiFilterable;

class DiscountRequest extends Model
{
    use HasFactory, SoftDeletes, ApiFilterable;

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'product_id',
        'patient_id',
        'status',
        'discount_percentage',
        'original_price',
        'discounted_price',
        'reason',
        'rejection_reason',
        'approval_notes',
        'approved_by',
        'approved_at',
        'expiry_date',
        'is_global',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'discount_percentage' => 'decimal:2',
        'original_price' => 'decimal:2',
        'discounted_price' => 'decimal:2',
        'expiry_date' => 'date',
        'approved_at' => 'datetime',
        'is_global' => 'boolean',
    ];

    /**
     * Get the user who requested the discount.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who approved the discount.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the product the discount is for.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the patient the discount is for.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Check if the discount request is pending.
     */
    public function isPending()
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if the discount request is approved.
     */
    public function isApproved()
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Check if the discount request is rejected.
     */
    public function isRejected()
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /**
     * Check if the discount has expired.
     */
    public function hasExpired()
    {
        return $this->expiry_date && now()->gt($this->expiry_date);
    }

    /**
     * Check if the discount is valid for use.
     */
    public function isValid()
    {
        return $this->isApproved() && !$this->hasExpired();
    }

    /**
     * Scope a query to only include active discounts.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_APPROVED)
                    ->where(function($q) {
                        $q->whereNull('expiry_date')
                          ->orWhere('expiry_date', '>=', now());
                    });
    }
} 