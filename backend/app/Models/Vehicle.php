<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    protected $primaryKey = 'vehicle_id';

    protected $fillable = [
        'plate_number',
        'brand',
        'model',
        'year_model',
        'vehicle_type',
        'color',
        'capacity',
        'mileage',
        'odometer_reading',
        'fuel_type',
        'condition',
        'registration_valid_from',
        'registration_valid_until',
        'last_maintenance_date',
        'next_maintenance_date',
        'photo',
        'status',
    ];

    public function deliveries()
    {
        return $this->hasMany(Delivery::class, 'vehicle_id');
    }

    public function maintenances()
    {
        return $this->hasMany(VehicleMaintenance::class, 'vehicle_id');
    }

    public function permits()
    {
        return $this->hasMany(Permit::class, 'vehicle_id');
    }

    public function driverLogs()
    {
        return $this->hasMany(DriverLog::class, 'vehicle_id');
    }
}