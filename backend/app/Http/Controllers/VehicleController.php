<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    public function index()
    {
        return Vehicle::with([
            'maintenances.part',
            'maintenances.partsUsages.part',
            'deliveries.driver.user',
            'deliveries.checklists',
        ])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
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
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'nullable|in:available,in_use,maintenance,broken,decommissioned',
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('vehicles', 'public');
        }

        return Vehicle::create($validated);
    }

    public function show(Vehicle $vehicle)
    {
        return $vehicle->load([
            'maintenances.part',
            'maintenances.partsUsages.part',
            'maintenances.maintainer',
            'deliveries.driver.user',
            'deliveries.request.customer',
            'partsUsages.part',
        ]);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'plate_number' => 'sometimes|unique:vehicles,plate_number,' . $vehicle->vehicle_id . ',vehicle_id',
            'fuel_type' => 'sometimes|in:diesel,gasoline,electric,hybrid',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'sometimes|in:available,in_use,maintenance,broken,decommissioned',
            'odometer_reading' => 'nullable|numeric|min:0',
        ]);

        $data = $request->except(['photo']);

        if ($request->hasFile('photo')) {
            $old = $vehicle->photo;
            $data['photo'] = $request->file('photo')->store('vehicles', 'public');
            if ($old) {
                Storage::disk('public')->delete($old);
            }
        }

        $vehicle->update($data);

        return $vehicle->fresh()->load([
            'maintenances.part',
            'maintenances.partsUsages.part',
            'deliveries.driver.user',
        ]);
    }

    public function destroy(Vehicle $vehicle)
    {
        if ($vehicle->photo) {
            Storage::disk('public')->delete($vehicle->photo);
        }

        $vehicle->delete();

        return response()->json([
            'message' => 'Vehicle deleted successfully.'
        ]);
    }
}