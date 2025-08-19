<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;
use App\Traits\DocumentManagement;

class Quote extends Model
{
    use HasFactory, ApiFilterable, DocumentManagement;

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_CONVERTED = 'converted';
    const STATUS_EXPIRED = 'expired';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'quote_number',
        'patient_id',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total',
        'status',
        'expiration_date',
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
        'tax_amount' => 'float',
        'discount_amount' => 'float',
        'total' => 'float',
        'expiration_date' => 'date',
    ];

    /**
     * Get the patient (client) that owns the quote.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the user who created the quote.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the items for the quote.
     */
    public function items()
    {
        return $this->hasMany(QuoteItem::class);
    }

    /**
     * Generate a unique quote number.
     *
     * @return string
     */
    public static function generateQuoteNumber()
    {
        return self::generateDocumentNumber('QUOTE-', 'quotes', 'quote_number');
    }

    /**
     * Convert quote to sale
     * 
     * @return Sale
     */
    public function convertToSale()
    {
        // Begin a database transaction
        \DB::beginTransaction();
        
        try {
            // Create the sale
            $sale = Sale::create([
                'sale_number' => Sale::generateSaleNumber(),
                'patient_id' => $this->patient_id,
                'subtotal' => $this->subtotal,
                'tax' => $this->tax,
                'discount' => $this->discount,
                'total' => $this->total,
                'amount_paid' => 0,
                'balance' => $this->total,
                'status' => 'pending',
                'payment_status' => 'pending',
                'notes' => "Convertido desde cotización: {$this->quote_number}. {$this->notes}",
                'created_by' => $this->created_by
            ]);
            
            // Convert each quote item to a sale item if there's a SaleItem model
            if (class_exists('App\\Models\\SaleItem')) {
                foreach ($this->items as $quoteItem) {
                    \App\Models\SaleItem::create([
                        'sale_id' => $sale->id,
                        'lens_id' => $quoteItem->lens_id,
                        'quantity' => $quoteItem->quantity,
                        'price' => $quoteItem->price,
                        'discount' => $quoteItem->discount,
                        'tax' => $quoteItem->tax,
                        'total' => $quoteItem->total,
                        'notes' => $quoteItem->notes
                    ]);
                }
            }

            // Update quote status
            $this->update(['status' => 'converted']);
            
            \DB::commit();
            return $sale;
        } catch (\Exception $e) {
            \DB::rollback();
            throw $e;
        }
    }
} 