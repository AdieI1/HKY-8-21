<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FuelIssuance extends Model
{
    protected $table = 'fuel_issuances';

    protected $primaryKey = 'issuance_id';

    public $timestamps = false;

    protected $fillable = [
        'fuel_id',
        'vehicle_id',
        'driver_id',
        'issued_by',
        'liters',
        'purpose',
        'issued_at',
    ];

    public function fuel()
    {
        return $this->belongsTo(FuelInventory::class, 'fuel_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}