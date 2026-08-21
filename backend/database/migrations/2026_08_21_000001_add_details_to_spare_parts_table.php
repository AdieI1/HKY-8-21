<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SparePart extends Model
{
    protected $primaryKey = 'part_id';

    protected $fillable = [
        'part_name',
        'category',
        'description',
        'quantity_in_stock',
        'unit',
        'unit_price',
        'reorder_level',
        'supplier_name',
        'brand',
        'model_part_code',
        'warranty',
        'supplier_contact',
        'supplier_address',
        'image',
        'status',
    ];

    // Adds `image_url` (full URL) to every array/JSON representation of
    // this model, alongside the raw `image` path, so the frontend doesn't
    // have to know the storage disk URL prefix.
    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->image ? asset('storage/' . $this->image) : null;
    }

    public function maintenances()
    {
        return $this->hasMany(VehicleMaintenance::class, 'part_id');
    }

    public function usages()
    {
        return $this->hasMany(SparePartUsage::class, 'part_id');
    }
}