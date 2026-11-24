<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\DeliveryTracking;
use App\Models\Driver;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SystemRuleEvaluator
{
    private const CACHE_LOCK_KEY = 'system_rules_last_evaluated';
    private const THROTTLE_SECONDS = 300; // 5 minutes

    /**
     * Runs rule enforcement at most once every 5 minutes (fail-safe; never throws).
     */
    public static function runIfDue(): void
    {
        try {
            if (!Cache::add(self::CACHE_LOCK_KEY, now()->timestamp, self::THROTTLE_SECONDS)) {
                return;
            }
            (new self())->enforceAll();
        } catch (\Throwable $e) {
            Log::warning('SystemRuleEvaluator::runIfDue skipped: ' . $e->getMessage());
        }
    }

    /**
     * Clears throttle lock so updated settings take effect immediately.
     */
    public static function resetThrottle(): void
    {
        try {
            Cache::forget(self::CACHE_LOCK_KEY);
        } catch (\Throwable $e) {
            // Ignore cache errors
        }
    }

    /**
     * Evaluates all System Configuration thresholds and Incident Notification Rules.
     */
    public function enforceAll(): array
    {
        $summary = [
            'purged_drivers' => 0,
            'purged_vehicles' => 0,
            'purged_users' => 0,
            'overdue_alerts' => 0,
            'gps_disconnect_alerts' => 0,
            'critical_alerts' => 0,
            'idle_alerts' => 0,
        ];

        $settings = SystemSetting::getSettings();
        $config = array_replace_recursive(
            SystemSetting::defaultSystemConfig(),
            is_array($settings->system_config) ? $settings->system_config : []
        );
        $rules = array_replace_recursive(
            SystemSetting::defaultNotificationRules(),
            is_array($settings->notification_rules) ? $settings->notification_rules : []
        );

        // 1. Archived Item Retention Duration (permanent purge of expired archives)
        $archiveEntry = $config['archived_retention_duration'] ?? ['value' => 2, 'unit' => 'months'];
        $archiveCutoff = $this->toCarbonCutoff($archiveEntry, 2, 'months');
        $this->purgeExpiredArchives($archiveCutoff, $summary);

        // 2. Overdue Request Threshold + Overdue Reminder Rule
        if (!empty($rules['overdue_reminder']['enabled'])) {
            $overdueEntry = $config['overdue_request_threshold'] ?? ['value' => 2, 'unit' => 'days'];
            $overdueCutoff = $this->toCarbonCutoff($overdueEntry, 2, 'days');
            $severity = strtoupper((string) ($rules['overdue_reminder']['severity'] ?? 'high'));
            $label = $this->formatDuration($overdueEntry, 2, 'days');
            $this->checkOverdueRequests($overdueCutoff, $severity, $label, $summary);
        }

        // 3. GPS Disconnect, Critical Alert, and Idle Duration on Active In-Transit Deliveries
        $gpsEnabled = !empty($rules['gps_disconnected']['enabled']);
        $criticalEnabled = !empty($rules['critical_alert']['enabled']);
        $idleEnabled = !empty($rules['idle_duration']['enabled']);

        if ($gpsEnabled || $criticalEnabled || $idleEnabled) {
            $gpsEntry = $config['gps_disconnect_alert'] ?? ['value' => 20, 'unit' => 'mins'];
            $criticalEntry = $config['critical_alert'] ?? ['value' => 24, 'unit' => 'hours'];
            $idleEntry = $config['idle_duration_threshold'] ?? ['value' => 30, 'unit' => 'mins'];

            $this->checkActiveTransitTelemetry(
                $gpsEnabled,
                $this->toCarbonCutoff($gpsEntry, 20, 'mins'),
                strtoupper((string) ($rules['gps_disconnected']['severity'] ?? 'high')),
                $this->formatDuration($gpsEntry, 20, 'mins'),
                $criticalEnabled,
                $this->toCarbonCutoff($criticalEntry, 24, 'hours'),
                strtoupper((string) ($rules['critical_alert']['severity'] ?? 'high')),
                $this->formatDuration($criticalEntry, 24, 'hours'),
                $idleEnabled,
                $this->toMinutes($idleEntry, 30, 'mins'),
                strtoupper((string) ($rules['idle_duration']['severity'] ?? 'medium')),
                $this->formatDuration($idleEntry, 30, 'mins'),
                $summary
            );
        }

        return $summary;
    }

    private function purgeExpiredArchives(Carbon $cutoff, array &$summary): void
    {
        // Permanently delete archived drivers past retention without linked delivery history
        try {
            $expiredDrivers = Driver::where('status', 'inactive')
                ->where('updated_at', '<=', $cutoff)
                ->whereDoesntHave('deliveries')
                ->get();

            foreach ($expiredDrivers as $driver) {
                try {
                    foreach (['license_file', 'medical_certificate_file', 'clearance_file'] as $docField) {
                        if ($driver->$docField) {
                            Storage::disk('public')->delete($driver->$docField);
                        }
                    }
                    $driver->delete();
                    $summary['purged_drivers']++;
                } catch (\Throwable $e) {
                    Log::warning("Archive retention skip driver #{$driver->driver_id}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Archive retention driver sweep error: ' . $e->getMessage());
        }

        // Permanently delete decommissioned vehicles past retention without linked delivery history
        try {
            $expiredVehicles = Vehicle::where('status', 'decommissioned')
                ->where('updated_at', '<=', $cutoff)
                ->whereDoesntHave('deliveries')
                ->get();

            foreach ($expiredVehicles as $vehicle) {
                try {
                    foreach ([
                        'photo',
                        'insurance_policy_file',
                        'official_receipt_file',
                        'certificate_of_registration_file',
                        'emission_certificate_file',
                    ] as $fileField) {
                        if ($vehicle->$fileField) {
                            Storage::disk('public')->delete($vehicle->$fileField);
                        }
                    }
                    $vehicle->delete();
                    $summary['purged_vehicles']++;
                } catch (\Throwable $e) {
                    Log::warning("Archive retention skip vehicle #{$vehicle->vehicle_id}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Archive retention vehicle sweep error: ' . $e->getMessage());
        }

        // Permanently delete archived non-admin user accounts past retention with no linked records
        try {
            $expiredUsers = User::where('status', 'inactive')
                ->where('role_id', '!=', 1)
                ->where('updated_at', '<=', $cutoff)
                ->whereDoesntHave('driver')
                ->get();

            foreach ($expiredUsers as $user) {
                try {
                    $hasRequests = DeliveryRequest::where('customer_id', $user->user_id)->exists();
                    if ($hasRequests) {
                        continue;
                    }
                    if ($user->profile_photo_path) {
                        Storage::disk('public')->delete($user->profile_photo_path);
                    }
                    $user->delete();
                    $summary['purged_users']++;
                } catch (\Throwable $e) {
                    Log::warning("Archive retention skip user #{$user->user_id}: " . $e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Archive retention user sweep error: ' . $e->getMessage());
        }
    }

    private function checkOverdueRequests(Carbon $cutoff, string $severity, string $label, array &$summary): void
    {
        try {
            $overdueRequests = DeliveryRequest::where('status', 'pending')
                ->where('created_at', '<=', $cutoff)
                ->get();

            foreach ($overdueRequests as $req) {
                $code = 'REQ' . str_pad((string) $req->request_id, 4, '0', STR_PAD_LEFT);
                $title = "[{$severity}] Overdue Request {$code}";

                $alreadySent = AppNotification::where('title', $title)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$alreadySent) {
                    AppNotification::notify(
                        'request',
                        $title,
                        "Pending delivery request {$code} has exceeded the {$label} processing threshold.",
                        '/requests'
                    );
                    $summary['overdue_alerts']++;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Overdue request rule check error: ' . $e->getMessage());
        }
    }

    private function checkActiveTransitTelemetry(
        bool $gpsEnabled,
        Carbon $gpsCutoff,
        string $gpsSeverity,
        string $gpsLabel,
        bool $criticalEnabled,
        Carbon $criticalCutoff,
        string $criticalSeverity,
        string $criticalLabel,
        bool $idleEnabled,
        int $idleMinutes,
        string $idleSeverity,
        string $idleLabel,
        array &$summary
    ): void {
        try {
            $activeDeliveries = Delivery::whereIn('status', [
                'arrived_pickup',
                'loading_cargo',
                'out_for_delivery',
                'arrived_dropoff',
                'unloading_cargo',
                'returning_to_hq',
            ])->get();

            foreach ($activeDeliveries as $del) {
                $code = 'DLV' . str_pad((string) $del->delivery_id, 4, '0', STR_PAD_LEFT);
                $latest = DeliveryTracking::where('delivery_id', $del->delivery_id)
                    ->orderByDesc('timestamp')
                    ->first();

                if (!$latest || empty($latest->timestamp)) {
                    continue;
                }

                $lastPing = Carbon::parse($latest->timestamp);

                // Critical GPS loss takes precedence over standard GPS disconnect
                if ($criticalEnabled && $lastPing->lte($criticalCutoff)) {
                    $title = "[{$criticalSeverity}] Critical GPS Loss: {$code}";
                    $exists = AppNotification::where('title', $title)
                        ->where('created_at', '>=', now()->subHours(12))
                        ->exists();
                    if (!$exists) {
                        AppNotification::notify(
                            'incident',
                            $title,
                            "Delivery {$code} has had no GPS signal for over {$criticalLabel}. Immediate administrative action required.",
                            '/delivery'
                        );
                        $summary['critical_alerts']++;
                    }
                    continue;
                }

                if ($gpsEnabled && $lastPing->lte($gpsCutoff)) {
                    $title = "[{$gpsSeverity}] GPS Disconnected: {$code}";
                    $exists = AppNotification::where('title', $title)
                        ->where('created_at', '>=', now()->subHours(6))
                        ->exists();
                    if (!$exists) {
                        AppNotification::notify(
                            'incident',
                            $title,
                            "GPS connectivity for {$code} has been lost for more than {$gpsLabel}.",
                            '/delivery'
                        );
                        $summary['gps_disconnect_alerts']++;
                    }
                    continue;
                }

                // Idle check applies only while actively driving between stops
                if ($idleEnabled && in_array($del->status, ['out_for_delivery', 'returning_to_hq'], true)) {
                    $windowStart = now()->subMinutes($idleMinutes);
                    $pings = DeliveryTracking::where('delivery_id', $del->delivery_id)
                        ->where('timestamp', '>=', $windowStart->toDateTimeString())
                        ->orderBy('timestamp')
                        ->get();

                    if ($pings->count() >= 2) {
                        $first = $pings->first();
                        $last = $pings->last();
                        $spanMinutes = Carbon::parse($first->timestamp)->diffInMinutes(Carbon::parse($last->timestamp));

                        if ($spanMinutes >= $idleMinutes) {
                            $movedMeters = 0.0;
                            foreach ($pings as $p) {
                                $d = $this->haversineMeters(
                                    (float) $first->latitude,
                                    (float) $first->longitude,
                                    (float) $p->latitude,
                                    (float) $p->longitude
                                );
                                if ($d > $movedMeters) {
                                    $movedMeters = $d;
                                }
                            }

                            if ($movedMeters < 50.0) {
                                $title = "[{$idleSeverity}] Vehicle Idle Alert: {$code}";
                                $exists = AppNotification::where('title', $title)
                                    ->where('created_at', '>=', now()->subHours(6))
                                    ->exists();
                                if (!$exists) {
                                    AppNotification::notify(
                                        'incident',
                                        $title,
                                        "Delivery {$code} has remained stationary for at least {$idleLabel} while in transit.",
                                        '/delivery'
                                    );
                                    $summary['idle_alerts']++;
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Active transit telemetry rule check error: ' . $e->getMessage());
        }
    }

    private function toCarbonCutoff(array $entry, int $defaultValue, string $defaultUnit): Carbon
    {
        $val = max(1, (int) ($entry['value'] ?? $defaultValue));
        $unit = strtolower((string) ($entry['unit'] ?? $defaultUnit));

        return match ($unit) {
            'mins', 'min', 'minutes' => now()->subMinutes($val),
            'hours', 'hour', 'hrs' => now()->subHours($val),
            'days', 'day' => now()->subDays($val),
            'months', 'month' => now()->subMonths($val),
            'years', 'year' => now()->subYears($val),
            default => now()->subDays($val),
        };
    }

    private function toMinutes(array $entry, int $defaultValue, string $defaultUnit): int
    {
        $val = max(1, (int) ($entry['value'] ?? $defaultValue));
        $unit = strtolower((string) ($entry['unit'] ?? $defaultUnit));

        return match ($unit) {
            'hours', 'hour', 'hrs' => $val * 60,
            'days', 'day' => $val * 1440,
            default => $val,
        };
    }

    private function formatDuration(array $entry, int $defaultValue, string $defaultUnit): string
    {
        $val = max(1, (int) ($entry['value'] ?? $defaultValue));
        $unit = strtolower((string) ($entry['unit'] ?? $defaultUnit));
        return "{$val} {$unit}";
    }

    private function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return 2 * $earthRadius * asin(min(1.0, sqrt($a)));
    }
}
