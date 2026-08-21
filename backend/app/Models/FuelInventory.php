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

    public function issuances()
    {
        return $this->hasMany(FuelIssuance::class, 'fuel_id');
    }
}