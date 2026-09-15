<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Driver;
use Carbon\Carbon;
use Illuminate\Http\Request;

class FleetAvailabilityController extends Controller
{
    private const ACTIVE_TRIP_STATUSES = [
        'assigned',
        'accepted',
        'arrived_pickup',
        'loading_cargo',
        'out_for_delivery',
        'arrived_dropoff',
        'unloading_cargo',
        'returning_to_hq',
    ];

    /**
     * Get fleet driver availability forecast and blocked dates.
     */
    public function forecast(Request $request)
    {
        $drivers = Driver::with('user')->get();
        $totalDrivers = $drivers->count();

        // Active trips currently in-transit or dispatched
        $activeDeliveries = Delivery::with(['driver.user', 'request', 'vehicle'])
            ->whereIn('status', self::ACTIVE_TRIP_STATUSES)
            ->get();

        $busyDrivers = [];
        $driverBusyUntil = [];

        foreach ($activeDeliveries as $delivery) {
            $driverId = $delivery->driver_id;
            if (!$driverId) continue;

            $distanceKm = (float) ($delivery->request->distance_km ?? 150);
            
            // Turnaround calculation based on distance across Mindanao
            if ($distanceKm > 350) {
                $days = 3;
            } elseif ($distanceKm > 150) {
                $days = 2;
            } else {
                $days = 1;
            }

            $start = $delivery->start_time 
                ? Carbon::parse($delivery->start_time) 
                : Carbon::parse($delivery->updated_at ?? now());

            $returnDate = $start->copy()->addDays($days);
            
            // If the calculated return date has passed but delivery is still in transit, estimate 1-2 days from now
            if ($returnDate->isPast()) {
                $returnDate = Carbon::today()->addDays($distanceKm > 200 ? 2 : 1);
            }

            $driverBusyUntil[$driverId] = $returnDate;

            $busyDrivers[] = [
                'driver_id' => $driverId,
                'driver_name' => $delivery->driver?->user?->full_name ?? "Driver DR{$driverId}",
                'delivery_id' => $delivery->delivery_id,
                'distance_km' => $distanceKm,
                'status' => $delivery->status,
                'estimated_return_date' => $returnDate->format('Y-m-d'),
                'estimated_return_label' => $returnDate->format('D, M j, Y'),
                'days_remaining' => max(1, (int) Carbon::today()->diffInDays($returnDate, false)),
            ];
        }

        // Available drivers right now (not in active trips and not on break)
        $busyDriverIds = array_keys($driverBusyUntil);
        $availableNowCount = $drivers->whereNotIn('driver_id', $busyDriverIds)->count();

        // Forecast availability for the next 14 days
        $daysForecast = [];
        $blockedDates = [];
        $earliestAvailableDate = null;
        $earliestLabel = null;

        $today = Carbon::today();

        for ($i = 0; $i < 14; $i++) {
            $checkDate = $today->copy()->addDays($i);
            $dateStr = $checkDate->format('Y-m-d');

            // Count drivers who are busy on this date
            $busyOnDate = 0;
            foreach ($driverBusyUntil as $dId => $until) {
                if ($checkDate->lt($until)) {
                    $busyOnDate++;
                }
            }

            // Count deliveries already scheduled for this date
            $scheduledOnDate = DeliveryRequest::where('is_scheduled', true)
                ->whereDate('scheduled_date', $dateStr)
                ->whereNotIn('status', ['cancelled', 'rejected'])
                ->count();

            $freeCapacity = max(0, $totalDrivers - $busyOnDate - $scheduledOnDate);

            $isBlocked = ($freeCapacity === 0);
            if ($isBlocked) {
                $blockedDates[] = $dateStr;
            } elseif (!$earliestAvailableDate && $i >= 0) {
                $earliestAvailableDate = $dateStr;
                $earliestLabel = $checkDate->format('l, M j');
            }

            $daysForecast[] = [
                'date' => $dateStr,
                'label' => $checkDate->format('D, M j'),
                'day_name' => $checkDate->format('l'),
                'free_capacity' => $freeCapacity,
                'is_blocked' => $isBlocked,
            ];
        }

        if (!$earliestAvailableDate) {
            $fallback = $today->copy()->addDays(3);
            $earliestAvailableDate = $fallback->format('Y-m-d');
            $earliestLabel = $fallback->format('l, M j');
        }

        return response()->json([
            'total_drivers' => $totalDrivers,
            'available_drivers_now' => $availableNowCount,
            'earliest_available_date' => $earliestAvailableDate,
            'earliest_available_label' => $earliestLabel,
            'earliest_available_slot' => '09:00 AM',
            'blocked_dates' => $blockedDates,
            'busy_drivers' => $busyDrivers,
            'days_forecast' => $daysForecast,
        ]);
    }
}
