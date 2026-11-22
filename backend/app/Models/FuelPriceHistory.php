<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FuelPriceHistory extends Model
{
    protected $table = 'fuel_price_history';

    protected $primaryKey = 'price_history_id';

    public $timestamps = false;

    protected $fillable = [
        'fuel_id',
        'previous_price',
        'new_price',
        'changed_by',
        'created_at',
    ];

    public function fuel()
    {
        return $this->belongsTo(FuelInventory::class, 'fuel_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by', 'user_id');
    }
}
