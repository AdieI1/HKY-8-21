<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $primaryKey = 'delivery_id';

    protected $fillable = [
        'request_id',
        'driver_id',
        'vehicle_id',
        'assigned_by',
        'permit_id',
        'status',
        'trip_date',
        'trip_cost',
        'starting_odometer',
        'ending_odometer',
        'starting_fuel',
        'ending_fuel',
        'fuel_unit',
        'fuel_issued',
        'fuel_receipt_no',
        'remarks',
        'receipt_photo',
        'payment_verification',
        'start_time',
        'end_time'
    ];

    protected $appends = ['distance_travelled', 'fuel_consumed'];

    public function getDistanceTravelledAttribute()
    {
        if ($this->ending_odometer !== null && $this->starting_odometer !== null) {
            return max(0, round((float)$this->ending_odometer - (float)$this->starting_odometer, 2));
        }
        return $this->request?->distance_km ?? null;
    }

    public function getFuelConsumedAttribute()
    {
        if ($this->starting_fuel !== null && $this->ending_fuel !== null) {
            return max(0, round((float)$this->starting_fuel - (float)$this->ending_fuel, 2));
        }
        return $this->fuel_issued ?? null;
    }

    /*
    |--------------------------------------------------------------------------
    | Delivery Request
    |--------------------------------------------------------------------------
    */

    public function request()
    {
        return $this->belongsTo(
            DeliveryRequest::class,
            'request_id',
            'request_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Driver
    |--------------------------------------------------------------------------
    */

    public function driver()
    {
        return $this->belongsTo(
            Driver::class,
            'driver_id',
            'driver_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Vehicle
    |--------------------------------------------------------------------------
    */

    public function vehicle()
    {
        return $this->belongsTo(
            Vehicle::class,
            'vehicle_id',
            'vehicle_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | User Who Assigned Delivery
    |--------------------------------------------------------------------------
    */

    public function assignedBy()
    {
        return $this->belongsTo(
            User::class,
            'assigned_by',
            'user_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Permit
    |--------------------------------------------------------------------------
    */

    public function permit()
    {
        return $this->belongsTo(
            Permit::class,
            'permit_id',
            'permit_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Tracking
    |--------------------------------------------------------------------------
    */

    public function tracking()
    {
        return $this->hasMany(
            DeliveryTracking::class,
            'delivery_id',
            'delivery_id'
        );
    }

    public function checklists()
    {
        return $this->hasMany(
            DeliveryChecklist::class,
            'delivery_id',
            'delivery_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Incidents
    |--------------------------------------------------------------------------
    */

    public function incidents()
    {
        return $this->hasMany(
            IncidentReport::class,
            'delivery_id',
            'delivery_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Reviews
    |--------------------------------------------------------------------------
    */

    public function reviews()
    {
        return $this->hasMany(
            Review::class,
            'delivery_id',
            'delivery_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Driver Logs
    |--------------------------------------------------------------------------
    */

    public function driverLogs()
    {
        return $this->hasMany(
            DriverLog::class,
            'delivery_id',
            'delivery_id'
        );
    }
}