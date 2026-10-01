<?php

namespace App\Http\Controllers;

use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WeatherController extends Controller
{
    protected WeatherService $weatherService;

    public function __construct(WeatherService $weatherService)
    {
        $this->weatherService = $weatherService;
    }

    /**
     * Get current or scheduled weather for location.
     */
    public function getWeather(Request $request): JsonResponse
    {
        $lat = (float) ($request->query('lat', WeatherService::DEFAULT_LAT));
        $lng = (float) ($request->query('lng', WeatherService::DEFAULT_LNG));
        $date = $request->query('date'); // optional YYYY-MM-DD

        $weather = $this->weatherService->getWeather($lat, $lng, $date);

        return response()->json($weather);
    }

    /**
     * Get route weather evaluation (origin -> destination).
     */
    public function getRouteWeather(Request $request): JsonResponse
    {
        $originLat = (float) ($request->query('origin_lat', WeatherService::DEFAULT_LAT));
        $originLng = (float) ($request->query('origin_lng', WeatherService::DEFAULT_LNG));
        $destLat = (float) ($request->query('dest_lat', $originLat));
        $destLng = (float) ($request->query('dest_lng', $originLng));

        $routeWeather = $this->weatherService->getRouteWeather($originLat, $originLng, $destLat, $destLng);

        return response()->json($routeWeather);
    }
}
