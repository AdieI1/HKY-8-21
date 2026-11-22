<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncidentReport extends Model
{
    protected $primaryKey = 'incident_id';

    public $timestamps = false;

    protected $fillable = [
        'delivery_id',
        'reported_by',
        'incident_type',
        'incident_types',
        'severity',
        'recommended_action',
        'recommendation_title',
        'recommendation_notes',
        'description',
        'location_address',
        'latitude',
        'longitude',
        'photo_proof',
        'photos',
        'status',
        'resolution_action',
        'resolution_notes',
        'police_report_no',
        'vehicle_towed_to',
        'cargo_condition',
        'refund_amount',
        'refund_reason',
        'refund_status',
        'resolved_by',
        'reported_at',
        'resolved_at'
    ];

    protected $casts = [
        'incident_types' => 'array',
        'photos' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        'refund_amount' => 'decimal:2',
        'reported_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by', 'user_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by', 'user_id');
    }
}