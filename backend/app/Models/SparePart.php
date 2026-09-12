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

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if (!$this->image) {
            return null;
        }
        return url('storage/' . $this->image);
    }

    /**
     * Determine automatic stock status based on quantity in stock and reorder level.
     */
    public static function determineStatus($quantity, $reorderLevel = 10)
    {
        $qty = (int) $quantity;
        $reorder = (int) ($reorderLevel ?? 10);

        if ($qty <= 0) {
            return 'out_of_stock';
        }
        if ($qty <= $reorder) {
            return 'low_stock';
        }
        return 'available';
    }

    protected static function booted()
    {
        static::saving(function ($sparePart) {
            if ($sparePart->isDirty('quantity_in_stock') || $sparePart->isDirty('reorder_level') || !$sparePart->status) {
                $sparePart->status = self::determineStatus($sparePart->quantity_in_stock, $sparePart->reorder_level);
            }
        });
    }

    public function maintenances()
    {
        return $this->hasMany(VehicleMaintenance::class, 'part_id', 'part_id');
    }

    public function usages()
    {
        return $this->hasMany(SparePartUsage::class, 'part_id', 'part_id');
    }
}