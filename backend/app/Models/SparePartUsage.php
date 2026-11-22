<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SparePartUsage extends Model
{
    protected $table = 'spare_parts_usage';

    protected $primaryKey = 'usage_id';

    protected $fillable = [
        'permit_id',
        'part_id',
        'transaction_type',
        'vehicle_id',
        'maintenance_id',
        'user_id',
        'supplier_name',
        'quantity_used',
        'unit_price',
        'total_value',
        'purpose',
        'used_date',
    ];

    public function permit()
    {
        return $this->belongsTo(Permit::class, 'permit_id', 'permit_id');
    }

    public function part()
    {
        return $this->belongsTo(SparePart::class, 'part_id', 'part_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    public function maintenance()
    {
        return $this->belongsTo(VehicleMaintenance::class, 'maintenance_id', 'maintenance_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}