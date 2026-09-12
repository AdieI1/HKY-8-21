<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permit extends Model
{
    protected $primaryKey = 'permit_id';

    protected $fillable = [
        'vehicle_id',
        'driver_id',
        'issued_by',
        'permit_type',
        'purpose',
        'origin_location',
        'destination_location',
        'permit_date',
        'expiry_date',
        'status',
        'remarks'
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class, 'permit_id');
    }

    public function sparePartUsages()
    {
        return $this->hasMany(SparePartUsage::class, 'permit_id');
    }
}