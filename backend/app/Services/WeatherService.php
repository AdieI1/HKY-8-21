<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    // Default depot coordinates (Cagayan de Oro HQ)
    public const DEFAULT_LAT = 8.4542;
    public const DEFAULT_LNG = 124.6319;
    public const DEFAULT_LOCATION = 'Cagayan de Oro';

    /**
     * WMO Weather Interpretation Codes
     */
    public const WMO_CODES = [
        0  => ['label' => 'Clear Sky', 'icon' => 'sunny', 'severity' => 'normal', 'speed_limit' => 60],
        1  => ['label' => 'Mainly Clear', 'icon' => 'partly_cloudy', 'severity' => 'normal', 'speed_limit' => 60],
        2  => ['label' => 'Partly Cloudy', 'icon' => 'partly_cloudy', 'severity' => 'normal', 'speed_limit' => 60],
        3  => ['label' => 'Overcast', 'icon' => 'cloudy', 'severity' => 'normal', 'speed_limit' => 60],
        45 => ['label' => 'Foggy', 'icon' => 'fog', 'severity' => 'caution', 'speed_limit' => 50, 'advisory' => 'Reduced visibility due to fog. Turn on low beams and increase following distance.'],
        48 => ['label' => 'Depositing Rime Fog', 'icon' => 'fog', 'severity' => 'caution', 'speed_limit' => 50, 'advisory' => 'Dense fog detected. Drive with extra caution.'],
        51 => ['label' => 'Light Drizzle', 'icon' => 'drizzle', 'severity' => 'caution', 'speed_limit' => 50, 'advisory' => 'Light drizzle ahead. Roads are damp and slick. Maintain 50 km/h.'],
        53 => ['label' => 'Moderate Drizzle', 'icon' => 'drizzle', 'severity' => 'caution', 'speed_limit' => 45, 'advisory' => 'Slippery road conditions from continuous drizzle.'],
        55 => ['label' => 'Dense Drizzle', 'icon' => 'drizzle', 'severity' => 'caution', 'speed_limit' => 45, 'advisory' => 'Damp asphalt with reduced braking grip.'],
        61 => ['label' => 'Slight Rain', 'icon' => 'rain', 'severity' => 'caution', 'speed_limit' => 50, 'advisory' => 'Slight rain on route. Wet asphalt, maintain safe braking space.'],
        63 => ['label' => 'Moderate Rain', 'icon' => 'rain', 'severity' => 'warning', 'speed_limit' => 45, 'advisory' => 'Moderate rain detected. Wet surface, recommended speed limit: 45 km/h.'],
        65 => ['label' => 'Heavy Rain', 'icon' => 'heavy_rain', 'severity' => 'severe', 'speed_limit' => 35, 'advisory' => 'Heavy rain downpour. High risk of hydroplaning and ponding. Reduce speed to 35 km/h.'],
        80 => ['label' => 'Light Showers', 'icon' => 'rain', 'severity' => 'caution', 'speed_limit' => 50, 'advisory' => 'Passing rain showers. Caution on curves.'],
        81 => ['label' => 'Moderate Showers', 'icon' => 'rain', 'severity' => 'warning', 'speed_limit' => 45, 'advisory' => 'Rain showers along trip route. Keep headlights on.'],
        82 => ['label' => 'Violent Rain Showers', 'icon' => 'heavy_rain', 'severity' => 'severe', 'speed_limit' => 30, 'advisory' => 'Torrential downpour detected. Very low visibility. Recommended speed: 30 km/h or pull over safely.'],
        95 => ['label' => 'Thunderstorm', 'icon' => 'thunderstorm', 'severity' => 'severe', 'speed_limit' => 30, 'advisory' => 'Active thunderstorm with lightning and strong winds. Max speed: 30 km/h. Keep extreme braking distance.'],
        96 => ['label' => 'Thunderstorm with Hail', 'icon' => 'thunderstorm', 'severity' => 'severe', 'speed_limit' => 25, 'advisory' => 'Severe thunderstorm with hail hazard. Proceed with extreme caution or seek safe shelter.'],
        99 => ['label' => 'Severe Thunderstorm', 'icon' => 'thunderstorm', 'severity' => 'severe', 'speed_limit' => 25, 'advisory' => 'Severe thunderstorm warning. Hazardous road conditions, potential flash floods/landslides. Pull over to safe area.']
    ];

    /**
     * Get weather forecast for given coordinate with 30-min cache.
     */
    public function getWeather(float $lat = self::DEFAULT_LAT, float $lng = self::DEFAULT_LNG, ?string $date = null): array
    {
        $roundLat = round($lat, 3);
        $roundLng = round($lng, 3);
        $cacheKey = "weather_{$roundLat}_{$roundLng}";

        // Check cache first (cached for 30 minutes)
        if (!$date && Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && !empty($cached)) {
                return $cached;
            }
        }

        try {
            $response = Http::timeout(4)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $lat,
                'longitude' => $lng,
                'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m',
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
                'timezone' => 'Asia/Manila'
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $formatted = $this->formatWeatherData($data, $lat, $lng, $date);

                // Cache for 30 minutes if it's current weather
                if (!$date) {
                    Cache::put($cacheKey, $formatted, now()->addMinutes(30));
                }

                return $formatted;
            }
        } catch (\Throwable $e) {
            Log::warning('Weather API fetch failed: ' . $e->getMessage());
        }

        // Return graceful fallback (keeps system completely stable)
        return $this->getFallbackData($lat, $lng);
    }

    /**
     * Evaluate weather along a delivery route (origin -> destination)
     */
    public function getRouteWeather(float $originLat, float $originLng, float $destLat, float $destLng): array
    {
        // Check destination weather (most important for delivery arrival)
        $destWeather = $this->getWeather($destLat, $destLng);

        // Calculate midpoint along route
        $midLat = ($originLat + $destLat) / 2;
        $midLng = ($originLng + $destLng) / 2;
        $midWeather = $this->getWeather($midLat, $midLng);

        // Find the more severe condition between midpoint and destination
        $destSeverityRank = $this->getSeverityRank($destWeather['severity'] ?? 'normal');
        $midSeverityRank = $this->getSeverityRank($midWeather['severity'] ?? 'normal');

        $worst = ($midSeverityRank > $destSeverityRank) ? $midWeather : $destWeather;
        $worstLocation = ($midSeverityRank > $destSeverityRank) ? 'along route' : 'near destination';

        $hasRain = in_array($worst['severity'], ['caution', 'warning', 'severe']) || ($worst['precipitation_probability'] ?? 0) >= 50;

        return [
            'origin' => [
                'lat' => $originLat,
                'lng' => $originLng
            ],
            'destination' => $destWeather,
            'midpoint' => $midWeather,
            'summary' => [
                'has_rain_ahead' => $hasRain,
                'worst_condition' => $worst['condition'],
                'worst_severity' => $worst['severity'],
                'location_context' => $worstLocation,
                'recommended_speed_limit' => $worst['speed_limit'],
                'driver_advisory' => $worst['advisory'] ?? "Drive safe. Weather condition: {$worst['condition']}.",
                'is_severe' => $worst['severity'] === 'severe',
                'dispatch_advisory' => $worst['dispatch_advisory'] ?? null
            ]
        ];
    }

    /**
     * Parse raw Open-Meteo payload into clean structured response
     */
    private function formatWeatherData(array $raw, float $lat, float $lng, ?string $targetDate = null): array
    {
        $current = $raw['current'] ?? [];
        $daily = $raw['daily'] ?? [];

        $currentCode = (int) ($current['weather_code'] ?? 0);
        $wmoInfo = self::WMO_CODES[$currentCode] ?? self::WMO_CODES[2];

        // Today's high/low
        $high = isset($daily['temperature_2m_max'][0]) ? round($daily['temperature_2m_max'][0]) : round(($current['temperature_2m'] ?? 28) + 2);
        $low = isset($daily['temperature_2m_min'][0]) ? round($daily['temperature_2m_min'][0]) : round(($current['temperature_2m'] ?? 28) - 4);
        $precipProb = isset($daily['precipitation_probability_max'][0]) ? (int) $daily['precipitation_probability_max'][0] : 0;

        // If target date requested (e.g. checking future scheduled delivery)
        if ($targetDate && isset($daily['time'])) {
            $dateIndex = array_search($targetDate, $daily['time']);
            if ($dateIndex !== false) {
                $schedCode = (int) ($daily['weather_code'][$dateIndex] ?? 0);
                $wmoInfo = self::WMO_CODES[$schedCode] ?? self::WMO_CODES[2];
                $high = round($daily['temperature_2m_max'][$dateIndex] ?? $high);
                $low = round($daily['temperature_2m_min'][$dateIndex] ?? $low);
                $precipProb = (int) ($daily['precipitation_probability_max'][$dateIndex] ?? 0);
            }
        }

        $isSevere = ($wmoInfo['severity'] === 'severe');
        $dispatchAdvisory = null;
        if ($isSevere) {
            $dispatchAdvisory = "Severe weather ({$wmoInfo['label']}) detected. Road hazards such as flooding or reduced visibility are expected. Recommend rescheduling trip or alerting customer.";
        }

        return [
            'success' => true,
            'latitude' => $lat,
            'longitude' => $lng,
            'temperature' => round($current['temperature_2m'] ?? 28),
            'apparent_temperature' => round($current['apparent_temperature'] ?? 30),
            'humidity' => round($current['relative_humidity_2m'] ?? 80),
            'high' => $high,
            'low' => $low,
            'condition' => $wmoInfo['label'],
            'icon' => $wmoInfo['icon'],
            'weather_code' => $currentCode,
            'severity' => $wmoInfo['severity'],
            'speed_limit' => $wmoInfo['speed_limit'],
            'precipitation_probability' => $precipProb,
            'wind_speed' => round($current['wind_speed_10m'] ?? 8),
            'advisory' => $wmoInfo['advisory'] ?? 'Road conditions normal. Drive safely.',
            'dispatch_advisory' => $dispatchAdvisory,
            'is_severe' => $isSevere,
            'updated_at' => now()->toIso8601String(),
            'cached' => false
        ];
    }

    private function getSeverityRank(string $sev): int
    {
        return match ($sev) {
            'severe' => 3,
            'warning' => 2,
            'caution' => 1,
            default => 0
        };
    }

    /**
     * Graceful fallback data if API unreachable
     */
    private function getFallbackData(float $lat, float $lng): array
    {
        return [
            'success' => true,
            'latitude' => $lat,
            'longitude' => $lng,
            'temperature' => 28,
            'apparent_temperature' => 31,
            'humidity' => 78,
            'high' => 31,
            'low' => 24,
            'condition' => 'Partly Cloudy',
            'icon' => 'partly_cloudy',
            'weather_code' => 2,
            'severity' => 'normal',
            'speed_limit' => 60,
            'precipitation_probability' => 20,
            'wind_speed' => 10,
            'advisory' => 'Drive safely and follow road safety rules.',
            'dispatch_advisory' => null,
            'is_severe' => false,
            'updated_at' => now()->toIso8601String(),
            'is_fallback' => true
        ];
    }
}
