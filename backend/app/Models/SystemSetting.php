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
        'system_config',
        'notification_rules',
        'system_version',
        'updated_by',
    ];

    protected $casts = [
        'base_labor_fee' => 'float',
        'distance_rate' => 'float',
        'weight_rate' => 'float',
        'system_config' => 'array',
        'notification_rules' => 'array',
    ];

    public static function defaultSystemConfig(): array
    {
        return [
            'break_monitoring' => ['value' => 8, 'unit' => 'hours'],
            'gps_disconnect_alert' => ['value' => 20, 'unit' => 'mins'],
            'overdue_request_threshold' => ['value' => 3, 'unit' => 'days'],
            'delivery_decline_threshold' => ['value' => 3],
            'archived_retention_duration' => ['value' => 2, 'unit' => 'months'],
            'critical_alert' => ['value' => 24, 'unit' => 'hours'],
        ];
    }

    public static function defaultNotificationRules(): array
    {
        return [
            'gps_disconnected' => ['enabled' => true, 'severity' => 'high'],
            'idle_duration' => ['enabled' => true, 'severity' => 'medium'],
            'declined_delivery' => ['enabled' => true, 'severity' => 'high'],
            'overdue_reminder' => ['enabled' => true, 'severity' => 'high'],
            'critical_alert' => ['enabled' => true, 'severity' => 'high'],
        ];
    }

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
                'system_config' => self::defaultSystemConfig(),
                'notification_rules' => self::defaultNotificationRules(),
                'system_version' => 'V.1.00',
                'updated_by' => null,
            ]);
            $setting->load('updatedByUser');
        } else {
            $setting->system_config = array_replace_recursive(
                self::defaultSystemConfig(),
                is_array($setting->system_config) ? $setting->system_config : []
            );
            $setting->notification_rules = array_replace_recursive(
                self::defaultNotificationRules(),
                is_array($setting->notification_rules) ? $setting->notification_rules : []
            );
        }

        return $setting;
    }
}
