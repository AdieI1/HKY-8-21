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

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute()
    {
        if (!$this->photo) {
            return null;
        }
        return url('storage/' . $this->photo);
    }

    public function getNextMaintenanceDateAttribute($value)
    {
        $today = now()->toDateString();
        if ($this->relationLoaded('maintenances')) {
            $futureScheduled = $this->maintenances->first(function ($m) use ($today) {
                return in_array($m->status, ['Scheduled', 'In Progress']) && $m->maintenance_date > $today;
            });
            if ($futureScheduled) {
                return $futureScheduled->maintenance_date;
            }
        }
        if ($value && $value > $today) {
            return $value;
        }
        return null;
    }

    public function getLastMaintenanceDateAttribute($value)
    {
        $today = now()->toDateString();
        if ($this->relationLoaded('maintenances')) {
            // 1. Explicitly completed maintenance
            $completed = $this->maintenances->first(function ($m) {
                return $m->status === 'Completed';
            });
            if ($completed) {
                return $completed->maintenance_date;
            }
            // 2. Any maintenance whose date has arrived or passed
            $pastMaintenance = $this->maintenances->first(function ($m) use ($today) {
                return $m->maintenance_date <= $today;
            });
            if ($pastMaintenance) {
                return $pastMaintenance->maintenance_date;
            }
        }
        if ($value && $value <= $today) {
            return $value;
        }
        $rawNext = $this->attributes['next_maintenance_date'] ?? null;
        if ($rawNext && $rawNext <= $today) {
            return $rawNext;
        }
        return $value;
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class, 'vehicle_id');
    }

    public function maintenances()
    {
        return $this->hasMany(VehicleMaintenance::class, 'vehicle_id', 'vehicle_id')->orderByDesc('maintenance_date');
    }

    public function partsUsages()
    {
        return $this->hasMany(SparePartUsage::class, 'vehicle_id', 'vehicle_id');
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