<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $primaryKey = 'review_id';

    public $timestamps = false;

    protected $fillable = [
        'delivery_id',
        'customer_id',
        'overall_rating',
        'driver_rating',
        'comments',
        'photo_path',
        'created_at'
    ];

    protected $appends = [
        'photo_url'
    ];

    public function getPhotoUrlAttribute()
    {
        return $this->photo_path ? asset('storage/' . $this->photo_path) : null;
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }
}