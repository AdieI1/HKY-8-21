<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    private function ensureAdmin(Request $request)
    {
        $user = $request->user();
        $roleName = strtolower($user?->role?->role_name ?? '');
        $isAdmin = $user && ((int) $user->role_id === 1 || str_contains($roleName, 'admin'));

        if (!$isAdmin) {
            return response()->json([
                'message' => 'Only administrators are authorized to modify system settings.',
            ], 403);
        }

        return null;
    }

    /**
     * Get the current system settings.
     */
    public function index()
    {
        $setting = SystemSetting::getSettings();
        return response()->json($setting);
    }

    /**
     * Update pricing configurations, system configuration thresholds, and/or incident notification rules.
     */
    public function update(Request $request)
    {
        if ($denied = $this->ensureAdmin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'base_labor_fee' => 'sometimes|numeric|min:0',
            'distance_rate' => 'sometimes|numeric|min:0',
            'weight_rate' => 'sometimes|numeric|min:0',
            'system_config' => 'sometimes|array',
            'notification_rules' => 'sometimes|array',
        ]);

        $setting = SystemSetting::getSettings();
        $updates = [
            'updated_by' => $request->user()?->user_id ?? $setting->updated_by,
        ];

        if (array_key_exists('base_labor_fee', $validated)) {
            $updates['base_labor_fee'] = $validated['base_labor_fee'];
        }
        if (array_key_exists('distance_rate', $validated)) {
            $updates['distance_rate'] = $validated['distance_rate'];
        }
        if (array_key_exists('weight_rate', $validated)) {
            $updates['weight_rate'] = $validated['weight_rate'];
        }
        if (array_key_exists('system_config', $validated)) {
            $updates['system_config'] = array_replace_recursive(
                SystemSetting::defaultSystemConfig(),
                is_array($setting->system_config) ? $setting->system_config : [],
                $validated['system_config']
            );
        }
        if (array_key_exists('notification_rules', $validated)) {
            $updates['notification_rules'] = array_replace_recursive(
                SystemSetting::defaultNotificationRules(),
                is_array($setting->notification_rules) ? $setting->notification_rules : [],
                $validated['notification_rules']
            );
        }

        $setting->update($updates);

        return response()->json(SystemSetting::getSettings());
    }

    /**
     * Reset pricing configurations (or rules) to system defaults.
     */
    public function reset(Request $request)
    {
        if ($denied = $this->ensureAdmin($request)) {
            return $denied;
        }

        $scope = $request->input('scope', 'pricing');
        $setting = SystemSetting::getSettings();

        $updates = [
            'updated_by' => $request->user()?->user_id ?? $setting->updated_by,
        ];

        if ($scope === 'rules') {
            $updates['system_config'] = SystemSetting::defaultSystemConfig();
            $updates['notification_rules'] = SystemSetting::defaultNotificationRules();
        } else {
            $updates['base_labor_fee'] = 800.00;
            $updates['distance_rate'] = 80.00;
            $updates['weight_rate'] = 1.00;
        }

        $setting->update($updates);

        return response()->json(SystemSetting::getSettings());
    }
}
