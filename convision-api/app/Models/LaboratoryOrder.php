<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;
use App\Traits\DocumentManagement;

class LaboratoryOrder extends Model
{
    use HasFactory, ApiFilterable, DocumentManagement;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_number',
        'order_id',
        'sale_id',
        'laboratory_id',
        'patient_id',
        'status',
        'priority',
        'estimated_completion_date',
        'completion_date',
        'notes',
        'created_by'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'estimated_completion_date' => 'date',
        'completion_date' => 'date',
    ];

    /**
     * Get the possible status values.
     */
    public static function getStatusOptions()
    {
        return [
            'pending' => 'Pendiente',
            'in_process' => 'En proceso',
            'sent_to_lab' => 'Enviado a laboratorio',
            'ready_for_delivery' => 'Listo para entregar',
            'delivered' => 'Entregado',
            'cancelled' => 'Cancelado'
        ];
    }

    /**
     * Get the order associated with the laboratory order.
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the sale associated with the laboratory order.
     */
    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    /**
     * Get the laboratory associated with the laboratory order.
     */
    public function laboratory()
    {
        return $this->belongsTo(Laboratory::class);
    }

    /**
     * Get the patient associated with the laboratory order.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Get the user who created the laboratory order.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the status history for the laboratory order.
     */
    public function statusHistory()
    {
        return $this->hasMany(LaboratoryOrderStatus::class);
    }

    /**
     * Generate a unique laboratory order number.
     *
     * @return string
     */
    public static function generateOrderNumber()
    {
        return self::generateDocumentNumber('LAB-', 'laboratory_orders', 'order_number');
    }
} 