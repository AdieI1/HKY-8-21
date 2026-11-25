<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryChecklist extends Model
{
    protected $primaryKey = 'checklist_id';

    protected $fillable = [
        'delivery_id',
        'type',
        'items',
        'inspected_by',
        'inspector_name',
        'remarks',
        'photos',
        'starting_odometer',
        'ending_odometer',
        'starting_fuel',
        'ending_fuel',
        'completed_at',
    ];

    protected $casts = [
        'items' => 'array',
        'photos' => 'array',
        'starting_odometer' => 'decimal:2',
        'ending_odometer' => 'decimal:2',
        'starting_fuel' => 'decimal:2',
        'ending_fuel' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'photo_urls',
    ];

    public function getPhotoUrlsAttribute(): array
    {
        $photos = is_array($this->photos) ? $this->photos : [];
        $urls = [];

        foreach ($photos as $path) {
            if (!is_string($path) || trim($path) === '') {
                continue;
            }
            $trimmed = trim($path);
            if (preg_match('/^https?:\/\//i', $trimmed) || str_starts_with($trimmed, 'data:')) {
                $urls[] = $trimmed;
                continue;
            }
            $clean = ltrim(preg_replace('#^/?storage/#', '', $trimmed), '/');
            $urls[] = request()
                ? request()->getSchemeAndHttpHost() . '/storage/' . $clean
                : url('storage/' . $clean);
        }

        return $urls;
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspected_by', 'user_id');
    }
}
