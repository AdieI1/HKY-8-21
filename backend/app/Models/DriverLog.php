<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverLog extends Model
{
    protected $table = 'driver_logs';

    protected $primaryKey = 'log_id';

    protected $fillable = [
        'driver_id',
        'vehicle_id',
        'delivery_id',
        'log_date',
        'time_in',
        'time_out',
        'starting_location',
        'ending_location',
        'fuel_used',
        'distance_travelled',
        'remarks',
        'status'
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }
}