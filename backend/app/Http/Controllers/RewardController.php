<?php

namespace App\Http\Controllers;

use App\Services\RewardsService;
use Illuminate\Http\Request;

class RewardController extends Controller
{
    public function summary()
    {
        return response()->json(RewardsService::getLeaderboardSummary());
    }

    public function myStatus(Request $request)
    {
        $user = $request->user()->load(['role', 'driver']);
        $roleName = strtolower($user->role?->role_name ?? '');

        if ($roleName === 'customer') {
            return response()->json([
                'role' => 'customer',
                'customer_vip' => RewardsService::getCustomerVipStatus((int) $user->user_id),
                'driver_reward' => null,
            ]);
        }

        if ($roleName === 'driver') {
            return response()->json([
                'role' => 'driver',
                'customer_vip' => null,
                'driver_reward' => RewardsService::getDriverRewardStatus($user->driver?->driver_id),
            ]);
        }

        return response()->json([
            'role' => $roleName ?: 'staff',
            'summary' => RewardsService::getLeaderboardSummary(),
        ]);
    }
}
