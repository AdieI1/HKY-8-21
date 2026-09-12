<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Get the current system settings.
     */
    public function index()
    {
        $setting = SystemSetting::getSettings();
        return response()->json($setting);
    }

    /**
     * Update the system pricing settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'base_labor_fee' => 'required|numeric|min:0',
            'distance_rate' => 'required|numeric|min:0',
            'weight_rate' => 'required|numeric|min:0',
        ]);

        $setting = SystemSetting::getSettings();
        $setting->update([
            'base_labor_fee' => $validated['base_labor_fee'],
            'distance_rate' => $validated['distance_rate'],
            'weight_rate' => $validated['weight_rate'],
            'updated_by' => $request->user()?->user_id ?? $setting->updated_by,
        ]);

        return response()->json($setting->fresh()->load('updatedByUser'));
    }

    /**
     * Reset pricing configurations to system defaults.
     */
    public function reset(Request $request)
    {
        $setting = SystemSetting::getSettings();
        $setting->update([
            'base_labor_fee' => 800.00,
            'distance_rate' => 80.00,
            'weight_rate' => 1.00,
            'updated_by' => $request->user()?->user_id ?? $setting->updated_by,
        ]);

        return response()->json($setting->fresh()->load('updatedByUser'));
    }
}
