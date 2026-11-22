<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleMaintenance extends Model
{
    protected $table = 'vehicle_maintenance';

    protected $primaryKey = 'maintenance_id';

    protected $fillable = [
        'vehicle_id',
        'part_id',
        'maintained_by',
        'maintained_by_name',
        'maintenance_type',
        'description',
        'notes',
        'maintenance_date',
        'next_maintenance_date',
        'total_cost',
        'maintenance_cost',
        'odometer_at_service',
        'status',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id', 'vehicle_id');
    }

    public function part()
    {
        return $this->belongsTo(SparePart::class, 'part_id', 'part_id');
    }

    public function maintainer()
    {
        return $this->belongsTo(User::class, 'maintained_by', 'user_id');
    }

    public function partsUsages()
    {
        return $this->hasMany(SparePartUsage::class, 'maintenance_id', 'maintenance_id');
    }
}