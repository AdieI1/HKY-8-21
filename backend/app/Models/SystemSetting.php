<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $table = 'system_settings';

    protected $fillable = [
        'base_labor_fee',
        'distance_rate',
        'weight_rate',
        'system_version',
        'updated_by',
    ];

    protected $casts = [
        'base_labor_fee' => 'float',
        'distance_rate' => 'float',
        'weight_rate' => 'float',
    ];

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id')->with('role');
    }

    /**
     * Get current singleton settings or create default.
     */
    public static function getSettings(): self
    {
        $setting = self::with('updatedByUser')->first();

        if (!$setting) {
            $setting = self::create([
                'base_labor_fee' => 800.00,
                'distance_rate' => 80.00,
                'weight_rate' => 1.00,
                'system_version' => 'V.1.00',
                'updated_by' => null,
            ]);
            $setting->load('updatedByUser');
        }

        return $setting;
    }
}
