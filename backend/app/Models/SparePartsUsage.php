<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SparePartsUsage extends Model
{
    protected $table = 'spare_parts_usage';

    protected $primaryKey = 'usage_id';

    protected $fillable = [
        'permit_id',
        'part_id',
        'quantity_used',
        'purpose',
        'used_date'
    ];

    public function permit()
    {
        return $this->belongsTo(Permit::class, 'permit_id');
    }

    public function part()
    {
        return $this->belongsTo(SparePart::class, 'part_id');
    }
}