<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;
use App\Traits\DocumentManagement;

class Sale extends Model
{
    use HasFactory, ApiFilterable, DocumentManagement;

    const STATUS_PENDING = 'pending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_REFUNDED = 'refunded';
    const STATUS_PARTIALLY_PAID = 'partially_paid'; // If applicable
    const STATUS_PAID = 'paid'; // For payment_status, but good to have general status

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_number',
        'order_id',
        'patient_id',
        'appointment_id',
        'subtotal',
        'tax',
        'discount',
        'total',
        'amount_paid',
        'balance',
        'status',
        'payment_status',
        'notes',
        'created_by'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'subtotal' => 'float',
        'tax' => 'float',
        'discount' => 'float',
        'total' => 'float',
        'amount_paid' => 'float',
        'balance' => 'float',
    ];

    /**
     * Get the patient that owns the sale.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the order associated with the sale.
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the appointment associated with the sale.
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Get the user who created the sale.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the payments for the sale.
     */
    public function payments()
    {
        return $this->hasMany(SalePayment::class);
    }
    
    /**
     * Get the partial payments (abonos) for the sale.
     */
    public function partialPayments()
    {
        return $this->hasMany(PartialPayment::class);
    }

    /**
     * Get the laboratory orders for the sale.
     */
    public function laboratoryOrders()
    {
        return $this->hasMany(LaboratoryOrder::class);
    }

    /**
     * Get the lens price adjustments for the sale.
     */
    public function lensPriceAdjustments()
    {
        return $this->hasMany(SaleLensPriceAdjustment::class);
    }

    /**
     * Get the items for the sale.
     */
    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * Calculate and update the balance
     */
    public function updateBalance()
    {
        $initialPayments = $this->payments()->sum('amount');
        $additionalPayments = $this->partialPayments()->sum('amount');
        
        $this->amount_paid = $initialPayments + $additionalPayments;
        $this->balance = $this->total - $this->amount_paid;
        
        // Update payment status based on balance
        if ($this->balance <= 0) {
            $this->payment_status = 'paid';
        } elseif ($this->amount_paid > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }
        
        $this->save();
        
        return $this;
    }

    /**
     * Generate a unique sale number.
     *
     * @return string
     */
    public static function generateSaleNumber()
    {
        return self::generateDocumentNumber('SALE-', 'sales', 'sale_number');
    }
}
