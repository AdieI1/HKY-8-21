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
        'maintenance_type',
        'description',
        'maintenance_date',
        'next_maintenance_date',
        'total_cost',
        'odometer_at_service',
        'status'
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function part()
    {
        return $this->belongsTo(SparePart::class, 'part_id');
    }

    public function maintainer()
    {
        return $this->belongsTo(User::class, 'maintained_by');
    }
}