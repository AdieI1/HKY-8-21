<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverLeave extends Model
{
    protected $table = 'driver_leaves';

    protected $primaryKey = 'leave_id';

    protected $fillable = [
        'driver_id',
        'user_id',
        'leave_type',
        'start_date',
        'end_date',
        'reason',
        'attachment_path',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'reviewed_at' => 'datetime',
    ];

    protected $appends = [
        'attachment_url',
    ];

    public function getAttachmentUrlAttribute()
    {
        if (!$this->attachment_path) {
            return null;
        }
        if (request()) {
            return request()->getSchemeAndHttpHost() . '/storage/' . ltrim($this->attachment_path, '/');
        }
        return url('storage/' . ltrim($this->attachment_path, '/'));
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id', 'driver_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'user_id');
    }
}
