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
        'estimated_duration_days',
        'estimated_delivery_date',
        'delay_reason',
        'delay_notified_at',
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
        'end_time',
        'is_relief',
        'cargo_loaded',
        'relief_origin_address',
        'relief_origin_lat',
        'relief_origin_lng',
        'stranded_driver_id',
        'stranded_vehicle_id',
        'relief_incident_id'
    ];

    protected $casts = [
        'is_relief' => 'boolean',
        'cargo_loaded' => 'boolean',
        'relief_origin_lat' => 'float',
        'relief_origin_lng' => 'float',
        'estimated_duration_days' => 'integer',
        'estimated_delivery_date' => 'datetime',
        'delay_notified_at' => 'datetime',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'trip_date' => 'date:Y-m-d',
    ];

    protected $appends = ['distance_travelled', 'fuel_consumed', 'is_delayed', 'target_eta'];

    public function getTargetEtaAttribute()
    {
        if ($this->estimated_delivery_date) {
            return $this->estimated_delivery_date->toIso8601String();
        }
        $days = $this->estimated_duration_days ?: 2;
        if (($this->request?->is_scheduled || $this->request?->scheduled_date) && $this->request?->scheduled_date) {
            $dateStr = substr((string)$this->request->scheduled_date, 0, 10);
            try {
                return \Carbon\Carbon::parse($dateStr)->addDays($days)->toIso8601String();
            } catch (\Exception $e) {}
        }
        if ($this->start_time) {
            return $this->start_time->copy()->addDays($days)->toIso8601String();
        }
        return null;
    }

    public function getIsDelayedAttribute()
    {
        if ($this->status === 'completed' || $this->status === 'rejected') {
            return false;
        }

        $isScheduled = (bool)($this->request?->is_scheduled || $this->request?->scheduled_date);
        $scheduledDateTime = null;

        if ($isScheduled && $this->request?->scheduled_date) {
            $dateStr = substr((string)$this->request->scheduled_date, 0, 10);
            $rawSlot = (string)($this->request->scheduled_time_slot ?? '');
            $timeStr = '08:00:00';
            if (preg_match('/(\d{1,2}):(\d{2})\s*(AM|PM)?/i', $rawSlot, $matches)) {
                $h = (int)$matches[1];
                $m = $matches[2];
                $ampm = strtoupper($matches[3] ?? '');
                if ($ampm === 'PM' && $h < 12) $h += 12;
                if ($ampm === 'AM' && $h === 12) $h = 0;
                $timeStr = sprintf('%02d:%s:00', $h, $m);
            }
            try {
                $scheduledDateTime = \Carbon\Carbon::parse("{$dateStr} {$timeStr}");
            } catch (\Exception $e) {
                try {
                    $scheduledDateTime = \Carbon\Carbon::parse($dateStr)->startOfDay();
                } catch (\Exception $e2) {
                    $scheduledDateTime = null;
                }
            }
        }

        // If this is a future scheduled booking, it CANNOT be delayed yet!
        if ($isScheduled && $scheduledDateTime && now()->lt($scheduledDateTime)) {
            return false;
        }

        // Stalled dispatch check
        if (in_array($this->status, ['assigned', 'accepted'])) {
            if ($isScheduled && $scheduledDateTime) {
                // If scheduled time has passed and vehicle has not departed
                if (now()->gt($scheduledDateTime)) {
                    return true;
                }
            } elseif ($this->start_time) {
                if (now()->diffInHours($this->start_time) >= 3) {
                    return true;
                }
            }
        }

        // Ongoing transit beyond ETA
        $targetEta = null;
        if ($this->estimated_delivery_date) {
            $targetEta = $this->estimated_delivery_date;
        } elseif ($this->start_time) {
            $days = $this->estimated_duration_days ?: 2;
            $targetEta = $this->start_time->copy()->addDays($days);
        }

        if ($targetEta && now()->gt($targetEta)) {
            return true;
        }

        return false;
    }

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

    public function assignedByUser()
    {
        return $this->belongsTo(
            User::class,
            'assigned_by',
            'user_id'
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

    public function strandedDriver()
    {
        return $this->belongsTo(
            Driver::class,
            'stranded_driver_id',
            'driver_id'
        );
    }

    public function strandedVehicle()
    {
        return $this->belongsTo(
            Vehicle::class,
            'stranded_vehicle_id',
            'vehicle_id'
        );
    }

    public function reliefIncident()
    {
        return $this->belongsTo(
            IncidentReport::class,
            'relief_incident_id',
            'incident_id'
        );
    }
}