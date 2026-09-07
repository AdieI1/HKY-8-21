<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ElevationService
{
    /**
     * Standard Earth radius in meters
     */
    private const EARTH_RADIUS_METERS = 6371000;

    /**
     * Normalize coordinate array to uniform [{lat: float, lng: float}] format
     */
    public function normalizeCoordinates(array $rawCoords): array
    {
        $normalized = [];

        foreach ($rawCoords as $originalIndex => $item) {
            $lat = null;
            $lng = null;

            if (is_array($item)) {
                if (isset($item['lat']) && isset($item['lng'])) {
                    $lat = (float) $item['lat'];
                    $lng = (float) $item['lng'];
                } elseif (isset($item['latitude']) && isset($item['longitude'])) {
                    $lat = (float) $item['latitude'];
                    $lng = (float) $item['longitude'];
                } elseif (isset($item[0]) && isset($item[1])) {
                    // Check if [lat, lng] or GeoJSON [lng, lat]
                    // If first value is in [-90, 90] and second is in [-180, 180]
                    $v0 = (float) $item[0];
                    $v1 = (float) $item[1];

                    // For the Philippines, latitude is ~4-21, longitude is ~116-127
                    if ($v0 >= 4 && $v0 <= 22 && $v1 >= 115 && $v1 <= 130) {
                        $lat = $v0;
                        $lng = $v1;
                    } elseif ($v1 >= 4 && $v1 <= 22 && $v0 >= 115 && $v0 <= 130) {
                        // GeoJSON standard [lng, lat]
                        $lng = $v0;
                        $lat = $v1;
                    } else {
                        // Default assumption [lat, lng]
                        $lat = $v0;
                        $lng = $v1;
                    }
                }
            } elseif (is_object($item)) {
                if (isset($item->lat) && isset($item->lng)) {
                    $lat = (float) $item->lat;
                    $lng = (float) $item->lng;
                }
            }

            if ($lat !== null && $lng !== null && is_finite($lat) && is_finite($lng)) {
                $origIndex = isset($item['orig_index']) ? (int) $item['orig_index'] : (int) $originalIndex;
                $normalized[] = [
                    'lat' => round($lat, 6),
                    'lng' => round($lng, 6),
                    'orig_index' => $origIndex,
                ];
            }
        }

        return $normalized;
    }

    /**
     * Downsamples dense route coordinates to target interval (e.g. every 40-50m)
     * Always preserves the start and end coordinates.
     */
    public function downsampleCoordinates(array $coords, float $intervalMeters = 45.0): array
    {
        $count = count($coords);
        if ($count <= 2) {
            return $coords;
        }

        $sampled = [$coords[0]];
        $lastSaved = $coords[0];
        $accumulatedDist = 0.0;

        for ($i = 1; $i < $count - 1; $i++) {
            $dist = $this->calculateHaversineDistance(
                $coords[$i - 1]['lat'],
                $coords[$i - 1]['lng'],
                $coords[$i]['lat'],
                $coords[$i]['lng']
            );

            $accumulatedDist += $dist;

            if ($accumulatedDist >= $intervalMeters) {
                $sampled[] = $coords[$i];
                $lastSaved = $coords[$i];
                $accumulatedDist = 0.0;
            }
        }

        // Always append the final destination coordinate
        $lastCoord = $coords[$count - 1];
        $finalDist = $this->calculateHaversineDistance(
            $lastSaved['lat'],
            $lastSaved['lng'],
            $lastCoord['lat'],
            $lastCoord['lng']
        );

        // If the final point is very close to the last sampled point (< 15m), replace it, otherwise append
        if ($finalDist < 15.0 && count($sampled) > 1) {
            $sampled[count($sampled) - 1] = $lastCoord;
        } else {
            $sampled[] = $lastCoord;
        }

        return $sampled;
    }

    /**
     * Compute Haversine distance in meters between two lat/lng points
     */
    public function calculateHaversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 +
             cos($lat1Rad) * cos($lat2Rad) * (sin($dLng / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_METERS * $c;
    }

    /**
     * Fetch elevations for points, utilizing DB cache and multi-provider fallbacks.
     * Returns array matching the input coordinates with 'elevation' attached.
     */
    public function getElevations(array $coordinates): array
    {
        $normalized = $this->normalizeCoordinates($coordinates);
        if (empty($normalized)) {
            return [];
        }

        // Round coordinates to 4 decimal places (~11m resolution) for cache lookups
        $cacheKeys = [];
        $uniqueLookup = [];

        foreach ($normalized as $idx => $pt) {
            $key = round($pt['lat'], 4) . ',' . round($pt['lng'], 4);
            $cacheKeys[$idx] = $key;
            if (!isset($uniqueLookup[$key])) {
                $uniqueLookup[$key] = [
                    'lat' => round($pt['lat'], 4),
                    'lng' => round($pt['lng'], 4),
                    'orig_lat' => $pt['lat'],
                    'orig_lng' => $pt['lng'],
                    'elevation' => null,
                ];
            }
        }

        // 1. Check local database cache
        $cachedElevations = $this->queryCachedElevations(array_keys($uniqueLookup));
        foreach ($cachedElevations as $key => $elev) {
            $uniqueLookup[$key]['elevation'] = $elev;
        }

        // 2. Identify missing points that need external elevation fetching
        $missingKeys = [];
        foreach ($uniqueLookup as $key => $data) {
            if ($data['elevation'] === null) {
                $missingKeys[] = $key;
            }
        }

        // 3. If any points are missing from cache, fetch from APIs in batches
        if (!empty($missingKeys)) {
            $pointsToFetch = array_map(fn($k) => $uniqueLookup[$k], $missingKeys);
            $fetchedMap = $this->fetchFromElevationProviders($pointsToFetch);

            $rowsToInsert = [];
            foreach ($fetchedMap as $key => $elev) {
                if ($elev !== null) {
                    $uniqueLookup[$key]['elevation'] = $elev;
                    $rowsToInsert[] = [
                        'lat' => $uniqueLookup[$key]['lat'],
                        'lng' => $uniqueLookup[$key]['lng'],
                        'elevation' => $elev,
                        'provider' => 'elevation-api',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            // Persist newly fetched elevations to DB cache
            if (!empty($rowsToInsert)) {
                try {
                    DB::table('coordinate_elevations')->insertOrIgnore($rowsToInsert);
                } catch (\Throwable $e) {
                    Log::warning('Failed to insert coordinate elevations into DB: ' . $e->getMessage());
                }
            }
        }

        // 4. Construct final array matching the original order
        $result = [];
        $lastKnownElevation = 10.0; // Sensible coastal default in meters

        foreach ($normalized as $idx => $pt) {
            $key = $cacheKeys[$idx];
            $elev = $uniqueLookup[$key]['elevation'];

            if ($elev === null) {
                $elev = $lastKnownElevation;
            } else {
                $lastKnownElevation = $elev;
            }

            $result[] = [
                'lat' => $pt['lat'],
                'lng' => $pt['lng'],
                'elevation' => round((float) $elev, 1),
                'orig_index' => $pt['orig_index'] ?? $idx,
            ];
        }

        return $result;
    }

    /**
     * Query cached elevations from database
     */
    private function queryCachedElevations(array $keys): array
    {
        $cached = [];
        if (empty($keys)) {
            return $cached;
        }

        try {
            // Build where clauses in chunks if large
            $chunks = array_chunk($keys, 200);
            foreach ($chunks as $chunk) {
                $rawRecords = DB::table('coordinate_elevations')
                    ->where(function ($query) use ($chunk) {
                        foreach ($chunk as $key) {
                            [$lat, $lng] = explode(',', $key);
                            $query->orWhere(function ($q) use ($lat, $lng) {
                                $q->where('lat', $lat)->where('lng', $lng);
                            });
                        }
                    })
                    ->get(['lat', 'lng', 'elevation']);

                foreach ($rawRecords as $rec) {
                    $key = round((float) $rec->lat, 4) . ',' . round((float) $rec->lng, 4);
                    $cached[$key] = (float) $rec->elevation;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Database cache lookup for elevations failed: ' . $e->getMessage());
        }

        return $cached;
    }

    /**
     * Resilient elevation fetch with multi-provider fallbacks:
     * 1. Open-Meteo API
     * 2. OpenTopoData (SRTM 90m)
     * 3. Open-Elevation
     */
    private function fetchFromElevationProviders(array $points): array
    {
        $results = [];
        if (empty($points)) {
            return $results;
        }

        // Try Provider 1: Open-Meteo (Fastest, handles up to 1000 points per call)
        try {
            $results = $this->fetchFromOpenMeteo($points);
            if (!empty($results)) {
                return $results;
            }
        } catch (\Throwable $e) {
            Log::warning('Open-Meteo elevation provider failed: ' . $e->getMessage());
        }

        // Try Provider 2: OpenTopoData
        try {
            $results = $this->fetchFromOpenTopoData($points);
            if (!empty($results)) {
                return $results;
            }
        } catch (\Throwable $e) {
            Log::warning('OpenTopoData elevation provider failed: ' . $e->getMessage());
        }

        // Try Provider 3: Open-Elevation
        try {
            $results = $this->fetchFromOpenElevation($points);
            if (!empty($results)) {
                return $results;
            }
        } catch (\Throwable $e) {
            Log::warning('Open-Elevation provider failed: ' . $e->getMessage());
        }

        return $results;
    }

    /**
     * Provider 1: Open-Meteo Elevation API
     */
    private function fetchFromOpenMeteo(array $points): array
    {
        $results = [];
        $chunks = array_chunk($points, 500); // 500 per call

        foreach ($chunks as $chunk) {
            $lats = implode(',', array_map(fn($p) => $p['orig_lat'], $chunk));
            $lngs = implode(',', array_map(fn($p) => $p['orig_lng'], $chunk));

            $response = Http::withoutVerifying()
                ->timeout(6)
                ->get('https://api.open-meteo.com/v1/elevation', [
                    'latitude' => $lats,
                    'longitude' => $lngs,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['elevation']) && is_array($data['elevation'])) {
                    foreach ($data['elevation'] as $i => $elev) {
                        if (isset($chunk[$i])) {
                            $key = $chunk[$i]['lat'] . ',' . $chunk[$i]['lng'];
                            $results[$key] = $elev !== null ? (float) $elev : null;
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Provider 2: OpenTopoData (srtm90m)
     */
    private function fetchFromOpenTopoData(array $points): array
    {
        $results = [];
        $chunks = array_chunk($points, 80); // max 100

        foreach ($chunks as $chunk) {
            $locs = implode('|', array_map(fn($p) => "{$p['orig_lat']},{$p['orig_lng']}", $chunk));
            $response = Http::withoutVerifying()
                ->timeout(6)
                ->get('https://api.opentopodata.org/v1/srtm90m', [
                    'locations' => $locs,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['results']) && is_array($data['results'])) {
                    foreach ($data['results'] as $i => $res) {
                        if (isset($chunk[$i])) {
                            $key = $chunk[$i]['lat'] . ',' . $chunk[$i]['lng'];
                            $elev = $res['elevation'] ?? null;
                            $results[$key] = $elev !== null ? (float) $elev : null;
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Provider 3: Open-Elevation
     */
    private function fetchFromOpenElevation(array $points): array
    {
        $results = [];
        $chunks = array_chunk($points, 80);

        foreach ($chunks as $chunk) {
            $payload = [
                'locations' => array_map(fn($p) => [
                    'latitude' => $p['orig_lat'],
                    'longitude' => $p['orig_lng'],
                ], $chunk),
            ];

            $response = Http::withoutVerifying()
                ->timeout(6)
                ->post('https://api.open-elevation.com/api/v1/lookup', $payload);

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['results']) && is_array($data['results'])) {
                    foreach ($data['results'] as $i => $res) {
                        if (isset($chunk[$i])) {
                            $key = $chunk[$i]['lat'] . ',' . $chunk[$i]['lng'];
                            $elev = $res['elevation'] ?? null;
                            $results[$key] = $elev !== null ? (float) $elev : null;
                        }
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Calculate route steepness segments, grade %, and summary stats.
     */
    public function computeRouteSteepness(
        array $rawCoords,
        float $sampleIntervalMeters = 45.0,
        float $steepThreshold = 8.0,
        float $verySteepThreshold = 12.0
    ): array {
        $normalized = $this->normalizeCoordinates($rawCoords);
        if (count($normalized) < 2) {
            return [
                'summary' => [
                    'total_distance_m' => 0,
                    'elevation_gain_m' => 0,
                    'elevation_loss_m' => 0,
                    'max_grade_pct' => 0,
                    'steep_segments_count' => 0,
                    'very_steep_segments_count' => 0,
                    'has_steep_segments' => false,
                ],
                'segments' => [],
                'points' => [],
            ];
        }

        // 1. Downsample points along the route
        $sampled = $this->downsampleCoordinates($normalized, $sampleIntervalMeters);

        // 2. Fetch elevations for downsampled points
        $pointsWithElevation = $this->getElevations($sampled);

        // 3. Compute segments
        $segments = [];
        $totalDistance = 0.0;
        $totalGain = 0.0;
        $totalLoss = 0.0;
        $maxGrade = 0.0;
        $steepCount = 0;
        $verySteepCount = 0;

        $ptCount = count($pointsWithElevation);
        for ($i = 0; $i < $ptCount - 1; $i++) {
            $p1 = $pointsWithElevation[$i];
            $p2 = $pointsWithElevation[$i + 1];

            $dist = $this->calculateHaversineDistance(
                $p1['lat'],
                $p1['lng'],
                $p2['lat'],
                $p2['lng']
            );

            // Skip zero or near-zero distance to prevent divide-by-zero & micro-jitter
            if ($dist < 10.0) {
                continue;
            }

            $elevChange = $p2['elevation'] - $p1['elevation'];
            $grade = ($elevChange / $dist) * 100.0;
            $absGrade = abs($grade);

            if ($absGrade > $maxGrade) {
                $maxGrade = $absGrade;
            }

            if ($elevChange > 0) {
                $totalGain += $elevChange;
            } else {
                $totalLoss += abs($elevChange);
            }

            $totalDistance += $dist;

            // Classify level
            if ($absGrade >= $verySteepThreshold) {
                $level = 'very_steep';
                $verySteepCount++;
            } elseif ($absGrade >= $steepThreshold) {
                $level = 'steep';
                $steepCount++;
            } else {
                $level = 'normal';
            }

            // Classify direction
            if ($grade >= 1.5) {
                $direction = 'uphill';
            } elseif ($grade <= -1.5) {
                $direction = 'downhill';
            } else {
                $direction = 'flat';
            }

            $startIndex = $p1['orig_index'] ?? $i;
            $endIndex = $p2['orig_index'] ?? ($i + 1);

            // Extract the full curvature path of the route for this segment
            $segmentPath = [];
            if ($endIndex >= $startIndex && isset($normalized[$startIndex]) && isset($normalized[$endIndex])) {
                $slice = array_slice($normalized, $startIndex, $endIndex - $startIndex + 1);
                foreach ($slice as $pt) {
                    $segmentPath[] = [
                        'lat' => $pt['lat'],
                        'lng' => $pt['lng'],
                    ];
                }
            } else {
                $segmentPath = [
                    ['lat' => $p1['lat'], 'lng' => $p1['lng']],
                    ['lat' => $p2['lat'], 'lng' => $p2['lng']],
                ];
            }

            $segments[] = [
                'start' => ['lat' => $p1['lat'], 'lng' => $p1['lng']],
                'end' => ['lat' => $p2['lat'], 'lng' => $p2['lng']],
                'start_index' => $startIndex,
                'end_index' => $endIndex,
                'path' => $segmentPath,
                'grade' => round($grade, 1),
                'abs_grade' => round($absGrade, 1),
                'level' => $level,
                'direction' => $direction,
                'distance_m' => round($dist, 1),
                'elevation_change_m' => round($elevChange, 1),
                'start_elevation_m' => $p1['elevation'],
                'end_elevation_m' => $p2['elevation'],
            ];
        }

        return [
            'summary' => [
                'total_distance_m' => round($totalDistance, 1),
                'total_distance_km' => round($totalDistance / 1000, 2),
                'elevation_gain_m' => round($totalGain, 1),
                'elevation_loss_m' => round($totalLoss, 1),
                'max_grade_pct' => round($maxGrade, 1),
                'steep_segments_count' => $steepCount,
                'very_steep_segments_count' => $verySteepCount,
                'has_steep_segments' => ($steepCount > 0 || $verySteepCount > 0),
                'steep_threshold' => $steepThreshold,
                'very_steep_threshold' => $verySteepThreshold,
            ],
            'segments' => $segments,
            'points' => $pointsWithElevation,
        ];
    }
}
