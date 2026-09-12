<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FuelInventory extends Model
{
    protected $table = 'fuel_inventory';

    protected $primaryKey = 'fuel_id';

    protected $fillable = [
        'fuel_type',
        'supplier_name',
        'current_stock',
        'unit',
        'unit_price',
        'reorder_level',
        'last_delivery_date',
    ];

    protected $appends = [
        'total_inventory_value',
    ];

    public function getTotalInventoryValueAttribute()
    {
        return round((float) ($this->current_stock ?? 0) * (float) ($this->unit_price ?? 0), 2);
    }

    public function issuances()
    {
        return $this->hasMany(FuelIssuance::class, 'fuel_id', 'fuel_id');
    }

    public function priceHistories()
    {
        return $this->hasMany(FuelPriceHistory::class, 'fuel_id', 'fuel_id')->orderByDesc('created_at');
    }
}