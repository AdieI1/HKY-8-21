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
        'license_file',
        'availability_status',
        'experience_years',
        'health_condition',
        'birthdate',
        'nationality',
        'last_medical_check',
        'prescriptions',
        'existing_conditions',
        'medical_certificate_file',
        'clearance_file',
        'clearance_type',
        'clearance_date',
        'date_hired',
        'hired_by',
        'contract_start',
        'contract_end',
        'status',
    ];

    protected $appends = [
        'license_file_url',
        'medical_certificate_file_url',
        'clearance_file_url',
    ];

    protected function formatStorageUrl($path)
    {
        if (!$path) {
            return null;
        }
        if (request()) {
            return request()->getSchemeAndHttpHost() . '/storage/' . ltrim($path, '/');
        }
        return url('storage/' . $path);
    }

    public function getLicenseFileUrlAttribute()
    {
        return $this->formatStorageUrl($this->license_file);
    }

    public function getMedicalCertificateFileUrlAttribute()
    {
        return $this->formatStorageUrl($this->medical_certificate_file);
    }

    public function getClearanceFileUrlAttribute()
    {
        return $this->formatStorageUrl($this->clearance_file);
    }

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