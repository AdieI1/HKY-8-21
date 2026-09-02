<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryTracking extends Model
{
    protected $table = 'delivery_tracking';

    protected $primaryKey = 'tracking_id';

    public $timestamps = false;

    protected $fillable = [
        'delivery_id',
        'latitude',
        'longitude',
        'status_update',
        'timestamp'
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }
}