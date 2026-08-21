<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    protected $primaryKey = 'driver_id';

    protected $fillable = [
        'user_id',
        'license_number',
        'license_type',
        'restriction_code',
        'license_date_issued',
        'license_expiry_date',
        'authorized_by',
        'availability_status',
        'experience_years',
        'health_condition',
        'birthdate',
        'nationality',
        'last_medical_check',
        'prescriptions',
        'existing_conditions',
        'date_hired',
        'hired_by',
        'contract_start',
        'contract_end',
        'status',
    ];

    /*
    |--------------------------------------------------------------------------
    | User
    |--------------------------------------------------------------------------
    */

    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id',
            'user_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Deliveries
    |--------------------------------------------------------------------------
    */

    public function deliveries()
    {
        return $this->hasMany(
            Delivery::class,
            'driver_id',
            'driver_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Permits
    |--------------------------------------------------------------------------
    */

    public function permits()
    {
        return $this->hasMany(
            Permit::class,
            'driver_id',
            'driver_id'
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
            'driver_id',
            'driver_id'
        );
    }
}