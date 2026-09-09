<?php

namespace App\Http\Controllers;

use App\Services\ElevationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class RouteElevationController extends Controller
{
    public function __construct(
        protected ElevationService $elevationService
    ) {}

    /**
     * Requirement 2: Fetch elevation for each point
     * POST /api/route/elevation
     * Body: { coordinates: [[lat, lng], ...] | [{lat, lng}, ...] }
     */
    public function getElevation(Request $request): JsonResponse
    {
        $coordinates = $request->input('coordinates', []);

        if (!is_array($coordinates) || empty($coordinates)) {
            return response()->json([
                'error' => 'Valid coordinates array is required.',
                'points' => [],
            ], 422);
        }

        try {
            $points = $this->elevationService->getElevations($coordinates);
            return response()->json([
                'points' => $points,
                'count' => count($points),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Failed to resolve elevation: ' . $e->getMessage(),
                'points' => [],
            ], 500);
        }
    }

    /**
     * Requirement 3: Compute grade % and detect steep segments along route
     * POST /api/route/steepness
     * Body: {
     *   coordinates: [...],
     *   sample_interval?: float,
     *   steep_threshold?: float,
     *   very_steep_threshold?: float
     * }
     */
    public function getSteepness(Request $request): JsonResponse
    {
        $coordinates = $request->input('coordinates', []);

        if (!is_array($coordinates) || count($coordinates) < 2) {
            return response()->json([
                'error' => 'At least two coordinates are required for route steepness computation.',
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
            ], 422);
        }

        $sampleInterval = (float) $request->input('sample_interval', 45.0);
        $steepThreshold = (float) $request->input('steep_threshold', 8.0);
        $verySteepThreshold = (float) $request->input('very_steep_threshold', 12.0);

        // Compute route hash for response-level caching
        $first = reset($coordinates);
        $last = end($coordinates);
        $count = count($coordinates);
        $routeHash = md5(json_encode([$first, $last, $count, $sampleInterval, $steepThreshold, $verySteepThreshold]));
        $cacheKey = "route_steepness_v5_{$routeHash}";

        $cachedResult = Cache::get($cacheKey);
        if ($cachedResult !== null) {
            return response()->json($cachedResult);
        }

        try {
            $result = $this->elevationService->computeRouteSteepness(
                $coordinates,
                $sampleInterval,
                $steepThreshold,
                $verySteepThreshold
            );

            // Cache route steepness for 1 day
            Cache::put($cacheKey, $result, 86400);

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Failed to compute route steepness: ' . $e->getMessage(),
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
            ], 500);
        }
    }
}
