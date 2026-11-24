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
        'transaction_type',
        'vehicle_id',
        'driver_id',
        'delivery_id',
        'supplier_name',
        'issued_by',
        'received_by',
        'liters',
        'unit_price',
        'total_value',
        'purpose',
        'fuel_receipt_no',
        'status',
        'issued_at',
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }

    public function fuel()
    {
        return $this->belongsTo(FuelInventory::class, 'fuel_id', 'fuel_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    public function issuedBy()
    {
        return $this->belongsTo(User::class, 'issued_by', 'user_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by', 'user_id');
    }
}