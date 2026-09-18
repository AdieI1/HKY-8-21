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
        'severity',
        'description',
        'location_address',
        'latitude',
        'longitude',
        'photo_proof',
        'photos',
        'status',
        'reported_at',
        'resolved_at'
    ];

    protected $casts = [
        'photos' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
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
}