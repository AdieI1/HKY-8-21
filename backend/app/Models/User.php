<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'role_id',
        'full_name',
        'email',
        'username',
        'phone',
        'gender',
        'date_of_birth',
        'profile_photo_path',
        'password',
        'status',
    ];

    protected $appends = [
        'profile_photo_url',
    ];

    public function getProfilePhotoUrlAttribute()
    {
        if (!$this->profile_photo_path) {
            return null;
        }
        return url('storage/' . $this->profile_photo_path);
    }

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function driver()
    {
        return $this->hasOne(Driver::class, 'user_id');
    }

    public function deliveryRequests()
    {
        return $this->hasMany(DeliveryRequest::class, 'customer_id');
    }

    public function assignedDeliveries()
    {
        return $this->hasMany(Delivery::class, 'assigned_by');
    }

    public function permitsIssued()
    {
        return $this->hasMany(Permit::class, 'issued_by');
    }
}