<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    public function index()
    {
        return Vehicle::all();
    }

    public function store(Request $request)
    {
        $request->validate([
            'plate_number' => 'required|unique:vehicles,plate_number',
            'model' => 'required|string|max:100',
            'brand' => 'nullable|string|max:100',
            'year_model' => 'nullable|integer',
            'vehicle_type' => 'required|string|max:50',
            'color' => 'required|string|max:50',
            'capacity' => 'nullable|numeric',
            'mileage' => 'nullable|numeric',
            'odometer_reading' => 'nullable|numeric',
            'fuel_type' => 'required|in:diesel,gasoline,electric,hybrid',
            'condition' => 'nullable|string|max:30',
            'registration_valid_from' => 'nullable|date',
            'registration_valid_until' => 'nullable|date',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'status' => 'nullable|in:available,in_use,maintenance,broken,decommissioned',
        ]);

        return Vehicle::create($request->all());
    }

    public function show(Vehicle $vehicle)
    {
        return $vehicle;
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $request->validate([
            'plate_number' => 'sometimes|unique:vehicles,plate_number,' . $vehicle->vehicle_id . ',vehicle_id',
            'fuel_type' => 'sometimes|in:diesel,gasoline,electric,hybrid',
            'status' => 'sometimes|in:available,in_use,maintenance,broken,decommissioned',
        ]);

        $vehicle->update($request->all());

        return $vehicle;
    }

    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();

        return response()->json([
            'message' => 'Vehicle deleted successfully.'
        ]);
    }
}