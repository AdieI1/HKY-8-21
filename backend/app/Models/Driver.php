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
        'agency_code',
        'license_date_issued',
        'license_expiry_date',
        'authorized_by',
        'license_file',
        'availability_status',
        'last_duty_date',
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

    public function leaves()
    {
        return $this->hasMany(
            DriverLeave::class,
            'driver_id',
            'driver_id'
        )->orderByDesc('leave_id');
    }

    public function hasActiveDelivery(): bool
    {
        return $this->deliveries()
            ->where(function ($q) {
                $q->whereNotIn('status', ['completed', 'delivered', 'rejected', 'cancelled', 'returning_to_hq'])
                  ->orWhere(function ($sub) {
                      $sub->where('status', 'returning_to_hq')
                          ->whereNull('hq_arrived_at');
                  });
            })
            ->exists();
    }

    /**
     * Synchronize leave status, midnight shift reset, and availability status for this driver.
     */
    public function syncLeaveAndDutyStatus(): self
    {
        $today = now()->toDateString();

        // 1. Auto-complete elapsed approved leaves
        DriverLeave::where('driver_id', $this->driver_id)
            ->where('status', 'approved')
            ->whereDate('end_date', '<', $today)
            ->update(['status' => 'completed']);

        if ($this->hasActiveDelivery()) {
            return $this->fresh();
        }

        // 2. Active approved leave covering today OR same-day pending sick/emergency leave locks driver
        $blockingLeave = DriverLeave::where('driver_id', $this->driver_id)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->where(function ($q) {
                $q->where('status', 'approved')
                  ->orWhere(function ($sub) {
                      $sub->where('status', 'pending')
                          ->whereIn('leave_type', ['sick_leave', 'emergency_absence']);
                  });
            })
            ->orderByRaw("CASE WHEN status = 'approved' THEN 0 ELSE 1 END")
            ->first();

        if ($blockingLeave) {
            $target = $blockingLeave->status === 'approved' ? 'on_leave' : 'pending_leave';
            if ($this->availability_status !== $target) {
                $this->update(['availability_status' => $target]);
            }
            return $this->fresh();
        }

        // 3. Release driver from on_leave / pending_leave back to off_duty once leave ends or is rejected/cancelled
        if (in_array($this->availability_status, ['on_leave', 'pending_leave'], true)) {
            $this->update(['availability_status' => 'off_duty']);
            return $this->fresh();
        }

        // 4. Midnight shift auto-reset: On-Duty drivers from a previous day clock out to off_duty at midnight
        if (
            $this->availability_status === 'available'
            && !empty($this->last_duty_date)
            && (string) $this->last_duty_date < $today
        ) {
            $this->update(['availability_status' => 'off_duty']);
            return $this->fresh();
        }

        // 5. Release stuck 'busy' drivers when no active delivery remains
        if ($this->availability_status === 'busy') {
            $nextStatus = (!empty($this->last_duty_date) && (string) $this->last_duty_date < $today)
                ? 'off_duty'
                : 'available';
            $this->update(['availability_status' => $nextStatus]);
        }

        return $this->fresh();
    }

    public static function syncAllStatuses(): void
    {
        $today = now()->toDateString();

        DriverLeave::where('status', 'approved')
            ->whereDate('end_date', '<', $today)
            ->update(['status' => 'completed']);

        static::with('user')->get()->each(function ($driver) {
            $driver->syncLeaveAndDutyStatus();
        });
    }
}