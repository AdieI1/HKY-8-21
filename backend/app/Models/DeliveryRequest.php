<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryRequest extends Model
{
    protected $primaryKey = 'request_id';

    protected $fillable = [
        'customer_id',
        'item_name',
        'cargo_type',
        'fragility',
        'weight',
        'pickup_address',
        'pickup_lat',
        'pickup_lng',
        'dropoff_address',
        'dropoff_lat',
        'dropoff_lng',
        'distance_km',
        'total_price',
        'payment_term',
        'payment_method',
        'status'
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function delivery()
    {
        return $this->hasOne(Delivery::class, 'request_id');
    }
}