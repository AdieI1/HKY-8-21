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
        'created_at'
    ];

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }
}