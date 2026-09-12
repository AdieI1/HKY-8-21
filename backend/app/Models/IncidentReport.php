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
        'photo_proof',
        'status',
        'reported_at',
        'resolved_at'
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}