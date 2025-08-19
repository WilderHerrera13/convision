<?php

namespace App\Traits;

trait DocumentItemTrait
{
    /**
     * Calculate the total for this item
     * 
     * @return float
     */
    public function calculateTotal()
    {
        return ($this->price * $this->quantity) - $this->discount;
    }
    
    /**
     * Calculate tax for this item
     * 
     * @param float $taxRate The tax rate to apply
     * @return float
     */
    public function calculateTax($taxRate = 0.19)
    {
        $subtotal = $this->calculateTotal();
        return $subtotal * $taxRate;
    }
    
    /**
     * Update this item with calculated values
     * 
     * @param float $taxRate The tax rate to apply
     * @return self
     */
    public function updateCalculations($taxRate = 0.19)
    {
        $this->total = $this->calculateTotal();
        $this->tax = $this->calculateTax($taxRate);
        return $this;
    }
} 