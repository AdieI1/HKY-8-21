<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryChecklist extends Model
{
    protected $primaryKey = 'checklist_id';

    protected $fillable = [
        'delivery_id',
        'type',
        'items',
        'starting_odometer',
        'ending_odometer',
        'starting_fuel',
        'ending_fuel',
        'completed_at',
    ];

    protected $casts = [
        'items' => 'array',
        'starting_odometer' => 'decimal:2',
        'ending_odometer' => 'decimal:2',
        'starting_fuel' => 'decimal:2',
        'ending_fuel' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }
}
