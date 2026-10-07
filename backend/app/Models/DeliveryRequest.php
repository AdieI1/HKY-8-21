<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryRequest extends Model
{
    protected $primaryKey = 'request_id';

    protected $fillable = [
        'customer_id',
        'item_name',
        'cargo_type',
        'fragility',
        'weight',
        'pickup_address',
        'pickup_lat',
        'pickup_lng',
        'dropoff_address',
        'dropoff_lat',
        'dropoff_lng',
        'distance_km',
        'total_price',
        'payment_term',
        'payment_method',
        'payment_receipt_path',
        'item_permit_path',
        'item_permit_type',
        'bank_name',
        'account_name',
        'account_number',
        'status',
        'is_scheduled',
        'scheduled_date',
        'scheduled_time_slot',
        'reschedule_proposed_date',
        'reschedule_proposed_time_slot',
        'reschedule_status',
    ];

    protected $casts = [
        'is_scheduled' => 'boolean',
        'scheduled_date' => 'date:Y-m-d',
        'reschedule_proposed_date' => 'date:Y-m-d',
    ];

    protected $appends = [
        'payment_receipt_url',
        'item_permit_url',
    ];

    public function getPaymentReceiptUrlAttribute()
    {
        if (!$this->payment_receipt_path) {
            return null;
        }
        return url('storage/' . $this->payment_receipt_path);
    }

    public function getItemPermitUrlAttribute()
    {
        if (!$this->item_permit_path) {
            return null;
        }
        if (str_starts_with($this->item_permit_path, 'http://') || str_starts_with($this->item_permit_path, 'https://')) {
            return str_replace('/api/storage/', '/storage/', $this->item_permit_path);
        }
        $url = url('storage/' . ltrim($this->item_permit_path, '/'));
        return str_replace('/api/storage/', '/storage/', $url);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function delivery()
    {
        return $this->hasOne(Delivery::class, 'request_id');
    }
}