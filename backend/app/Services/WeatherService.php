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
     * Get weather forecast for given coordinate with 10-min cache.
     */
    public function getWeather(float $lat = self::DEFAULT_LAT, float $lng = self::DEFAULT_LNG, ?string $date = null): array
    {
        $roundLat = round($lat, 3);
        $roundLng = round($lng, 3);
        $cacheKey = "weather_{$roundLat}_{$roundLng}_" . ($date ?: 'current');

        // Check cache first (cached for 10 minutes for fast response & timely weather shifts)
        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && !empty($cached)) {
                return $cached;
            }
        }

        try {
            $response = Http::timeout(8)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $lat,
                'longitude' => $lng,
                'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m',
                'hourly' => 'precipitation,rain,weather_code',
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
                'timezone' => 'Asia/Manila',
                'forecast_days' => 7
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $formatted = $this->formatWeatherData($data, $lat, $lng, $date);

                // Cache for 10 minutes
                Cache::put($cacheKey, $formatted, now()->addMinutes(10));

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

        $hasRain = !empty($worst['is_raining']) || in_array($worst['severity'], ['caution', 'warning', 'severe']) || ($worst['precipitation_probability'] ?? 0) >= 45;

        return [
            'origin' => [
                'lat' => $originLat,
                'lng' => $originLng
            ],
            'destination' => $destWeather,
            'midpoint' => $midWeather,
            'summary' => [
                'has_rain_ahead' => $hasRain,
                'is_raining' => $worst['is_raining'] ?? false,
                'rain_type' => $worst['rain_type'] ?? 'none',
                'rain_type_label' => $worst['rain_type_label'] ?? 'No Rain',
                'road_condition' => $worst['road_condition'] ?? 'Dry',
                'worst_condition' => $worst['condition'],
                'worst_severity' => $worst['severity'],
                'location_context' => $worstLocation,
                'recommended_speed_limit' => $worst['speed_limit'],
                'speed_recommendation_text' => $worst['speed_recommendation_text'] ?? "{$worst['speed_limit']} km/h",
                'driver_advisory' => $worst['advisory'] ?? "Drive safe. Weather condition: {$worst['condition']}.",
                'is_severe' => ($worst['severity'] === 'severe'),
                'dispatch_advisory' => $worst['dispatch_advisory'] ?? null
            ]
        ];
    }

    /**
     * Parse raw Open-Meteo payload into clean structured response with rain type & wet road speeds
     */
    private function formatWeatherData(array $raw, float $lat, float $lng, ?string $targetDate = null): array
    {
        $current = $raw['current'] ?? [];
        $daily = $raw['daily'] ?? [];
        $hourly = $raw['hourly'] ?? [];

        $todayIso = now('Asia/Manila')->toDateString();
        $isFutureDate = ($targetDate && $targetDate > $todayIso);

        $currentRain = (float) ($current['rain'] ?? 0);
        $currentPrecip = (float) ($current['precipitation'] ?? 0);
        $currentShowers = (float) ($current['showers'] ?? 0);
        $effectivePrecip = max($currentRain, $currentPrecip, $currentShowers);

        // Check recent hourly if current precip is 0 but recent convective rain was recorded
        if ($effectivePrecip === 0.0 && !empty($hourly['time']) && !empty($hourly['precipitation'])) {
            $currentTimeStr = $current['time'] ?? now('Asia/Manila')->format('Y-m-d\TH:00');
            $currentHourIndex = array_search(substr($currentTimeStr, 0, 13) . ':00', $hourly['time']);
            if ($currentHourIndex !== false && isset($hourly['precipitation'][$currentHourIndex])) {
                $hourlyP = (float) $hourly['precipitation'][$currentHourIndex];
                if ($hourlyP > $effectivePrecip) {
                    $effectivePrecip = $hourlyP;
                }
            }
        }

        $currentCode = (int) ($current['weather_code'] ?? 0);
        $wmoInfo = self::WMO_CODES[$currentCode] ?? self::WMO_CODES[2];

        // Today's high/low & precip prob
        $high = isset($daily['temperature_2m_max'][0]) ? round($daily['temperature_2m_max'][0]) : round(($current['temperature_2m'] ?? 28) + 2);
        $low = isset($daily['temperature_2m_min'][0]) ? round($daily['temperature_2m_min'][0]) : round(($current['temperature_2m'] ?? 28) - 4);
        $precipProb = isset($daily['precipitation_probability_max'][0]) ? (int) $daily['precipitation_probability_max'][0] : ($effectivePrecip > 0 ? 80 : 0);

        // Default conditions
        $isRaining = false;
        $rainType = 'none';
        $rainTypeLabel = 'None';
        $roadCondition = 'Dry';
        $speedLimit = 60;
        $conditionLabel = $wmoInfo['label'];
        $icon = $wmoInfo['icon'];
        $severity = $wmoInfo['severity'];
        $advisory = $wmoInfo['advisory'] ?? 'Road conditions normal. Drive safely.';

        // Detect rain categories: Thunderstorm, Strong / Heavy Rain, Moderate Rain, Light Rain
        $isThunderstormCode = in_array($currentCode, [95, 96, 99]);
        $isStrongRainCode = in_array($currentCode, [65, 82]);
        $isModerateRainCode = in_array($currentCode, [63, 81]);
        $isLightRainCode = in_array($currentCode, [51, 53, 55, 61, 80]);

        if ($isThunderstormCode) {
            $isRaining = true;
            $rainType = 'thunderstorm';
            $rainTypeLabel = 'Thunderstorm';
            $conditionLabel = ($currentCode === 99) ? 'Severe Thunderstorm' : 'Thunderstorm';
            $icon = 'thunderstorm';
            $severity = 'severe';
            $speedLimit = 30; // 30 km/h for thunderstorm
            $roadCondition = 'Wet & Hazardous (Hydroplaning & Lightning Risk)';
            $advisory = 'Active thunderstorm with torrential rain. Roads are wet and hazardous. Recommended speed: 30 km/h. Keep extreme braking distance.';
        } elseif ($isStrongRainCode || $effectivePrecip >= 4.0) {
            $isRaining = true;
            $rainType = 'strong_rain';
            $rainTypeLabel = 'Strong Rain';
            $conditionLabel = 'Strong Rain Downpour';
            $icon = 'heavy_rain';
            $severity = 'severe';
            $speedLimit = 30; // 30-35 km/h for strong downpour
            $roadCondition = 'Wet & Slippery (High Hydroplaning Risk)';
            $advisory = 'Heavy rain downpour detected. Road surface is wet with high risk of hydroplaning and ponding. Strictly keep speed to 30-35 km/h.';
        } elseif ($isModerateRainCode || $effectivePrecip >= 1.5) {
            $isRaining = true;
            $rainType = 'moderate_rain';
            $rainTypeLabel = 'Moderate Rain';
            $conditionLabel = 'Moderate Rain';
            $icon = 'rain';
            $severity = 'warning';
            $speedLimit = 35; // 35-40 km/h for moderate rain
            $roadCondition = 'Wet Asphalt';
            $advisory = 'Moderate rain detected. Wet road surface with reduced braking grip. Maintain safe 35-40 km/h speed limit.';
        } elseif ($isLightRainCode || $effectivePrecip > 0.05) {
            $isRaining = true;
            $rainType = 'light_rain';
            $rainTypeLabel = 'Light Rain';
            $conditionLabel = ($currentCode === 51 || $currentCode === 53) ? 'Light Drizzle' : 'Light Rain';
            $icon = 'rain';
            $severity = 'caution';
            $speedLimit = 40; // 40 km/h for light rain / wet road
            $roadCondition = 'Damp & Slick Roads';
            $advisory = 'Light rain / drizzle detected. Roads are wet and slippery. Recommended safe speed: 40 km/h.';
        }

        // If target date is a genuine future scheduled date, evaluate future forecast
        if ($isFutureDate && isset($daily['time'])) {
            $dateIndex = array_search($targetDate, $daily['time']);
            if ($dateIndex !== false) {
                $schedCode = (int) ($daily['weather_code'][$dateIndex] ?? 0);
                $wmoInfo = self::WMO_CODES[$schedCode] ?? self::WMO_CODES[2];
                $high = round($daily['temperature_2m_max'][$dateIndex] ?? $high);
                $low = round($daily['temperature_2m_min'][$dateIndex] ?? $low);
                $precipProb = (int) ($daily['precipitation_probability_max'][$dateIndex] ?? 0);
                $precipSum = (float) ($daily['precipitation_sum'][$dateIndex] ?? 0);

                if (in_array($schedCode, [95, 96, 99])) {
                    $isRaining = true;
                    $rainType = 'thunderstorm';
                    $rainTypeLabel = 'Thunderstorm';
                    $conditionLabel = 'Thunderstorm Forecasted';
                    $icon = 'thunderstorm';
                    $severity = 'severe';
                    $speedLimit = 30;
                    $roadCondition = 'Wet & Hazardous Expected';
                    $advisory = 'Thunderstorm forecasted on trip date. Unfavorable wet road conditions. Max speed: 30 km/h.';
                } elseif (in_array($schedCode, [65, 82]) || $precipSum >= 10.0) {
                    $isRaining = true;
                    $rainType = 'strong_rain';
                    $rainTypeLabel = 'Strong Rain';
                    $conditionLabel = 'Strong Rain Forecasted';
                    $icon = 'heavy_rain';
                    $severity = 'severe';
                    $speedLimit = 35;
                    $roadCondition = 'Wet & Slippery Expected';
                    $advisory = 'Heavy rain downpour forecasted on scheduled date. Wet roads expected. Recommended speed: 30-35 km/h.';
                } elseif (in_array($schedCode, [63, 81]) || $precipSum >= 3.0 || $precipProb >= 60) {
                    $isRaining = true;
                    $rainType = 'moderate_rain';
                    $rainTypeLabel = 'Moderate Rain';
                    $conditionLabel = 'Moderate Rain Forecasted';
                    $icon = 'rain';
                    $severity = 'warning';
                    $speedLimit = 40;
                    $roadCondition = 'Wet Road Expected';
                    $advisory = 'Rain showers forecasted on scheduled date. Wet roads expected, recommended speed: 35-40 km/h.';
                } elseif (in_array($schedCode, [51, 53, 55, 61, 80]) || $precipSum > 0 || $precipProb >= 40) {
                    $isRaining = true;
                    $rainType = 'light_rain';
                    $rainTypeLabel = 'Light Rain';
                    $conditionLabel = 'Light Rain Forecasted';
                    $icon = 'rain';
                    $severity = 'caution';
                    $speedLimit = 40;
                    $roadCondition = 'Damp Road Expected';
                    $advisory = 'Passing rain showers forecasted on trip date. Maintain 40 km/h and safe distance.';
                } else {
                    $isRaining = false;
                    $rainType = 'none';
                    $rainTypeLabel = 'None';
                    $conditionLabel = $wmoInfo['label'];
                    $icon = $wmoInfo['icon'];
                    $severity = $wmoInfo['severity'];
                    $speedLimit = $wmoInfo['speed_limit'];
                    $roadCondition = 'Dry';
                    $advisory = $wmoInfo['advisory'] ?? 'Road conditions normal. Drive safely.';
                }
            }
        }

        $isSevere = ($severity === 'severe');
        $dispatchAdvisory = null;
        if ($isSevere) {
            $dispatchAdvisory = "Severe weather ({$conditionLabel}) detected. High risk of hydroplaning and wet road hazards. Recommended max speed: {$speedLimit} km/h.";
        } elseif ($isRaining) {
            $dispatchAdvisory = "Wet road conditions ({$conditionLabel}). Reduced tire grip. Recommended safe fleet speed: {$speedLimit} km/h.";
        }

        $speedText = $isRaining ? "{$speedLimit} km/h (Wet Road Limit: 30-40 km/h)" : "{$speedLimit} km/h";

        return [
            'success' => true,
            'latitude' => $lat,
            'longitude' => $lng,
            'temperature' => round($current['temperature_2m'] ?? 28),
            'apparent_temperature' => round($current['apparent_temperature'] ?? 30),
            'humidity' => round($current['relative_humidity_2m'] ?? 80),
            'high' => $high,
            'low' => $low,
            'condition' => $conditionLabel,
            'rain_type' => $rainType,
            'rain_type_label' => $rainTypeLabel,
            'road_condition' => $roadCondition,
            'is_wet_road' => $isRaining,
            'is_raining' => $isRaining,
            'precipitation_rate' => $effectivePrecip,
            'icon' => $icon,
            'weather_code' => $currentCode,
            'severity' => $severity,
            'speed_limit' => $speedLimit,
            'speed_recommendation_text' => $speedText,
            'precipitation_probability' => $precipProb,
            'wind_speed' => round($current['wind_speed_10m'] ?? 8),
            'advisory' => $advisory,
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
            'rain_type' => 'none',
            'rain_type_label' => 'None',
            'road_condition' => 'Dry',
            'is_wet_road' => false,
            'is_raining' => false,
            'precipitation_rate' => 0.0,
            'icon' => 'partly_cloudy',
            'weather_code' => 2,
            'severity' => 'normal',
            'speed_limit' => 60,
            'speed_recommendation_text' => '60 km/h',
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
