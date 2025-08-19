<?php

namespace App\Traits;

use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

trait DocumentManagement
{
    /**
     * Calculate the total, subtotal, and taxes for a document.
     *
     * @param array $items Array of items with price, quantity, discount
     * @param float $documentDiscount Overall document discount percentage
     * @return array Associative array with subtotal, tax, discount, and total
     */
    public static function calculateTotals(array $items, float $documentDiscount = 0)
    {
        $subtotal = 0;
        
        // Calculate subtotal from all items
        foreach ($items as $item) {
            $lineTotal = $item['price'] * $item['quantity'] - $item['discount'];
            $subtotal += $lineTotal;
        }
        
        // Apply document-level discount
        $discountAmount = ($subtotal * $documentDiscount) / 100;
        $afterDiscount = $subtotal - $discountAmount;
        
        // Calculate tax (assuming 19% VAT)
        $taxRate = 0.19;
        $taxAmount = $afterDiscount * $taxRate;
        
        // Calculate total
        $total = $afterDiscount + $taxAmount;
        
        return [
            'subtotal' => $subtotal,
            'tax' => $taxAmount,
            'discount' => $discountAmount,
            'total' => $total
        ];
    }
    
    /**
     * Generate a unique document number with a prefix.
     *
     * @param string $prefix Prefix for the document (e.g., 'QUOTE-', 'SALE-')
     * @param string $tableName The table to check for existing numbers
     * @param string $columnName The column containing document numbers
     * @return string Unique document number
     */
    public static function generateDocumentNumber($prefix, $tableName, $columnName = null)
    {
        $columnName = $columnName ?: $tableName . '_number';
        $date = now()->format('Ymd');
        $lastDoc = self::where($columnName, 'like', $prefix . $date . '%')
            ->orderBy('id', 'desc')
            ->first();

        $sequence = '0001';
        if ($lastDoc) {
            $lastSequence = substr($lastDoc->$columnName, -4);
            $sequence = str_pad((int) $lastSequence + 1, 4, '0', STR_PAD_LEFT);
        }

        return $prefix . $date . '-' . $sequence;
    }
} 