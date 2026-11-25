<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Review;

class RewardsService
{
    public const DRIVER_BONUS_AMOUNT = 1000;
    public const TOP1_VOUCHER_AMOUNT = 300;
    public const TOP5_VOUCHER_AMOUNT = 200;
    public const MIN_TRIP_FOR_VOUCHER = 1500;
    public const TOP_CUSTOMER_LIMIT = 5;

    /**
     * Compute the current Top 1 Driver, Top 5 VIP Customers leaderboard,
     * and fixed margin-safe reward rules.
     */
    public static function getLeaderboardSummary(): array
    {
        $deliveries = Delivery::with(['driver.user', 'request.customer'])
            ->orderByDesc('delivery_id')
            ->get();

        $reviews = Review::whereNotNull('delivery_id')->get()->keyBy('delivery_id');

        $driverMap = [];
        $customerMap = [];

        foreach ($deliveries as $delivery) {
            if ($delivery->driver && $delivery->driver->user) {
                $driverId = (int) $delivery->driver->driver_id;
                if (!isset($driverMap[$driverId])) {
                    $driverMap[$driverId] = [
                        'driver_id' => $driverId,
                        'user_id' => (int) ($delivery->driver->user_id ?? $delivery->driver->user->user_id),
                        'full_name' => $delivery->driver->user->full_name ?: 'Driver',
                        'license_number' => $delivery->driver->license_number,
                        'profile_photo_url' => $delivery->driver->user->profile_photo_url,
                        'completed' => 0,
                        'ratings' => [],
                    ];
                }

                if ($delivery->status === 'completed') {
                    $driverMap[$driverId]['completed'] += 1;
                }

                $review = $reviews->get($delivery->delivery_id);
                if ($review) {
                    $score = (float) ($review->driver_rating ?? $review->overall_rating ?? 0);
                    if ($score > 0) {
                        $driverMap[$driverId]['ratings'][] = $score;
                    }
                }
            }

            $customer = $delivery->request?->customer;
            if ($customer) {
                $userId = (int) $customer->user_id;
                if (!isset($customerMap[$userId])) {
                    $customerMap[$userId] = [
                        'user_id' => $userId,
                        'full_name' => $customer->full_name ?: 'Customer',
                        'email' => $customer->email,
                        'profile_photo_url' => $customer->profile_photo_url,
                        'requests_count' => 0,
                        'total_spend' => 0.0,
                    ];
                }

                $customerMap[$userId]['requests_count'] += 1;
                if ($delivery->payment_verification === 'approved') {
                    $customerMap[$userId]['total_spend'] += (float) ($delivery->trip_cost ?? 0);
                }
            }
        }

        // Rank drivers: completed trips desc, avg rating desc, driver_id asc
        $rankedDrivers = array_values(array_filter($driverMap, fn ($entry) => $entry['completed'] > 0));
        usort($rankedDrivers, function ($a, $b) {
            if ($b['completed'] !== $a['completed']) {
                return $b['completed'] <=> $a['completed'];
            }
            $avgA = count($a['ratings']) ? array_sum($a['ratings']) / count($a['ratings']) : 0;
            $avgB = count($b['ratings']) ? array_sum($b['ratings']) / count($b['ratings']) : 0;
            if ($avgB !== $avgA) {
                return $avgB <=> $avgA;
            }
            return $a['driver_id'] <=> $b['driver_id'];
        });

        $topDriver = null;
        if (!empty($rankedDrivers)) {
            $first = $rankedDrivers[0];
            $avgRating = count($first['ratings'])
                ? round(array_sum($first['ratings']) / count($first['ratings']), 1)
                : null;
            $topDriver = [
                'rank' => 1,
                'driver_id' => $first['driver_id'],
                'user_id' => $first['user_id'],
                'full_name' => $first['full_name'],
                'license_number' => $first['license_number'],
                'profile_photo_url' => $first['profile_photo_url'],
                'completed_deliveries' => $first['completed'],
                'rating' => $avgRating,
                'review_count' => count($first['ratings']),
                'badge' => '#1 Top Driver',
                'bonus_amount' => self::DRIVER_BONUS_AMOUNT,
            ];
        }

        // Rank customers: total approved spend desc, requests_count desc, user_id asc
        $rankedCustomers = array_values(array_filter($customerMap, fn ($entry) => $entry['total_spend'] > 0));
        usort($rankedCustomers, function ($a, $b) {
            if ($b['total_spend'] !== $a['total_spend']) {
                return $b['total_spend'] <=> $a['total_spend'];
            }
            if ($b['requests_count'] !== $a['requests_count']) {
                return $b['requests_count'] <=> $a['requests_count'];
            }
            return $a['user_id'] <=> $b['user_id'];
        });

        $topCustomers = [];
        $monthTag = strtoupper(now()->format('My'));
        foreach (array_slice($rankedCustomers, 0, self::TOP_CUSTOMER_LIMIT) as $idx => $cust) {
            $rank = $idx + 1;
            $voucherAmount = $rank === 1 ? self::TOP1_VOUCHER_AMOUNT : self::TOP5_VOUCHER_AMOUNT;
            $topCustomers[] = [
                'rank' => $rank,
                'user_id' => $cust['user_id'],
                'full_name' => $cust['full_name'],
                'email' => $cust['email'],
                'profile_photo_url' => $cust['profile_photo_url'],
                'requests_count' => $cust['requests_count'],
                'total_spend' => round($cust['total_spend'], 2),
                'is_vip' => true,
                'vip_label' => 'VIP',
                'tier_label' => $rank === 1 ? 'Rank #1 VIP' : 'Top 5 VIP',
                'voucher_amount' => $voucherAmount,
                'voucher_code' => "VIP{$rank}-{$monthTag}",
            ];
        }

        return [
            'period_label' => now()->format('F Y'),
            'top_driver' => $topDriver,
            'top_customers' => $topCustomers,
            'rules' => [
                'driver_bonus_amount' => self::DRIVER_BONUS_AMOUNT,
                'rank1_voucher_amount' => self::TOP1_VOUCHER_AMOUNT,
                'top5_voucher_amount' => self::TOP5_VOUCHER_AMOUNT,
                'min_trip_amount' => self::MIN_TRIP_FOR_VOUCHER,
                'vouchers_per_month' => 1,
                'priority_dispatch' => false,
            ],
        ];
    }

    /**
     * Personal VIP status and monthly voucher eligibility for a customer.
     */
    public static function getCustomerVipStatus(int $userId): array
    {
        $summary = self::getLeaderboardSummary();
        $matched = null;
        foreach ($summary['top_customers'] as $cust) {
            if ((int) $cust['user_id'] === $userId) {
                $matched = $cust;
                break;
            }
        }

        if (!$matched) {
            return [
                'is_vip' => false,
                'rank' => null,
                'vip_label' => null,
                'tier_label' => null,
                'voucher_amount' => 0,
                'voucher_code' => null,
                'already_redeemed_this_month' => false,
                'redeemed_request_id' => null,
                'available_this_month' => false,
                'min_trip_amount' => self::MIN_TRIP_FOR_VOUCHER,
                'period_label' => $summary['period_label'],
            ];
        }

        $redeemedRequest = DeliveryRequest::where('customer_id', $userId)
            ->where('vip_voucher_amount', '>', 0)
            ->whereNotIn('status', ['draft', 'rejected'])
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->latest('request_id')
            ->first();

        $alreadyRedeemed = $redeemedRequest !== null;

        return [
            'is_vip' => true,
            'rank' => $matched['rank'],
            'vip_label' => $matched['vip_label'],
            'tier_label' => $matched['tier_label'],
            'voucher_amount' => $matched['voucher_amount'],
            'voucher_code' => $matched['voucher_code'],
            'already_redeemed_this_month' => $alreadyRedeemed,
            'redeemed_request_id' => $redeemedRequest?->request_id,
            'available_this_month' => !$alreadyRedeemed,
            'min_trip_amount' => self::MIN_TRIP_FOR_VOUCHER,
            'period_label' => $summary['period_label'],
        ];
    }

    /**
     * Personal #1 Top Driver reward status for a driver.
     */
    public static function getDriverRewardStatus(?int $driverId): array
    {
        $summary = self::getLeaderboardSummary();
        $topDriver = $summary['top_driver'];
        $isTopDriver = $driverId && $topDriver && (int) $topDriver['driver_id'] === (int) $driverId;

        return [
            'is_top_driver' => (bool) $isTopDriver,
            'rank' => $isTopDriver ? 1 : null,
            'badge' => $isTopDriver ? ($topDriver['badge'] ?? '#1 Top Driver') : null,
            'bonus_amount' => $isTopDriver ? self::DRIVER_BONUS_AMOUNT : 0,
            'target_bonus_amount' => self::DRIVER_BONUS_AMOUNT,
            'completed_deliveries' => $isTopDriver ? $topDriver['completed_deliveries'] : null,
            'rating' => $isTopDriver ? $topDriver['rating'] : null,
            'top_driver_name' => $topDriver['full_name'] ?? null,
            'period_label' => $summary['period_label'],
        ];
    }
}
