<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    public function index()
    {
        VehicleMaintenanceController::checkAndCompleteExpiredMaintenance();

        // Auto-sync: If vehicle is marked in_use but has no active ongoing deliveries, release to available
        Vehicle::where('status', 'in_use')
            ->whereDoesntHave('deliveries', function ($q) {
                $q->whereNotIn('status', ['completed', 'rejected']);
            })
            ->update(['status' => 'available']);

        return Vehicle::with([
            'maintenances.part',
            'maintenances.partsUsages.part',
            'deliveries.driver.user',
            'deliveries.checklists',
        ])->get();
    }

    public function store(Request $request)
    {
        $fieldsToUppercase = ['plate_number', 'insurance_policy_number', 'or_number', 'cr_number'];
        $toMerge = [];
        foreach ($fieldsToUppercase as $f) {
            if ($request->has($f) && !is_null($request->$f)) {
                $toMerge[$f] = strtoupper(trim((string)$request->$f));
            }
        }
        if (!empty($toMerge['plate_number'])) {
            $toMerge['plate_number'] = preg_replace('/\s*-\s*/', '-', $toMerge['plate_number']);
        }
        if (!empty($toMerge)) {
            $request->merge($toMerge);
        }

        $validated = $request->validate([
            'plate_number' => ['required', 'string', 'regex:/^[A-Z]{3}-\d{4}$/', 'unique:vehicles,plate_number'],
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
            'insurance_provider' => 'nullable|string|max:150',
            'insurance_policy_number' => ['nullable', 'string', 'regex:/^[A-Z0-9][A-Z0-9\-\/\.]{3,29}$/i', 'max:50'],
            'insurance_coverage_type' => 'nullable|string|max:100',
            'insurance_valid_from' => 'nullable|date',
            'insurance_valid_until' => 'nullable|date',
            'insurance_policy_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'or_number' => ['nullable', 'string', 'regex:/^((OR-)?[A-Z0-9]{6,18}|\d{7,18})$/i', 'max:30'],
            'cr_number' => ['nullable', 'string', 'regex:/^((CR-)?[A-Z0-9]{6,14}|\d{7,14})$/i', 'max:30'],
            'registration_date' => 'nullable|date',
            'expiration_date' => 'nullable|date',
            'official_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'certificate_of_registration_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_date' => 'nullable|date',
        ], [
            'plate_number.regex' => 'The plate number must be in the format ABC-1234 (3 letters, hyphen, 4 numbers).',
            'insurance_policy_number.regex' => 'The policy number must be a valid format (e.g. POL-8921-X, 4-30 alphanumeric characters).',
            'or_number.regex' => 'The OR number must be valid (e.g. OR-8912401 or 7-18 alphanumeric characters).',
            'cr_number.regex' => 'The CR number must be valid (e.g. CR-1928401 or 7-14 alphanumeric characters).',
        ]);

        $fileFields = [
            'photo' => 'vehicles',
            'insurance_policy_file' => 'vehicles/documents',
            'official_receipt_file' => 'vehicles/documents',
            'certificate_of_registration_file' => 'vehicles/documents',
            'emission_certificate_file' => 'vehicles/documents',
        ];

        foreach ($fileFields as $field => $folder) {
            if ($request->hasFile($field)) {
                $validated[$field] = $request->file($field)->store($folder, 'public');
            }
        }

        $vehicle = Vehicle::create($validated);
        AppNotification::notify('vehicle', 'New Vehicle Registered', "Vehicle {$vehicle->brand} {$vehicle->model} ({$vehicle->plate_number}) added to fleet.", '/vehicles');

        return $vehicle;
    }

    public function show(Vehicle $vehicle)
    {
        if ($vehicle->status === 'in_use') {
            $hasActiveDelivery = $vehicle->deliveries()
                ->whereNotIn('status', ['completed', 'rejected'])
                ->exists();
            if (!$hasActiveDelivery) {
                $vehicle->update(['status' => 'available']);
                $vehicle->refresh();
            }
        }

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
        $fieldsToUppercase = ['plate_number', 'insurance_policy_number', 'or_number', 'cr_number'];
        $toMerge = [];
        foreach ($fieldsToUppercase as $f) {
            if ($request->has($f) && !is_null($request->$f)) {
                $toMerge[$f] = strtoupper(trim((string)$request->$f));
            }
        }
        if (!empty($toMerge['plate_number'])) {
            $toMerge['plate_number'] = preg_replace('/\s*-\s*/', '-', $toMerge['plate_number']);
        }
        if (!empty($toMerge)) {
            $request->merge($toMerge);
        }

        $validated = $request->validate([
            'plate_number' => ['sometimes', 'string', 'regex:/^[A-Z]{3}-\d{4}$/', 'unique:vehicles,plate_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'fuel_type' => 'sometimes|in:diesel,gasoline,electric,hybrid',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'sometimes|in:available,in_use,maintenance,broken,decommissioned',
            'odometer_reading' => 'nullable|numeric|min:0',
            'insurance_provider' => 'nullable|string|max:150',
            'insurance_policy_number' => ['nullable', 'string', 'regex:/^[A-Z0-9][A-Z0-9\-\/\.]{3,29}$/i', 'max:50'],
            'insurance_coverage_type' => 'nullable|string|max:100',
            'insurance_valid_from' => 'nullable|date',
            'insurance_valid_until' => 'nullable|date',
            'insurance_policy_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'or_number' => ['nullable', 'string', 'regex:/^((OR-)?[A-Z0-9]{6,18}|\d{7,18})$/i', 'max:30'],
            'cr_number' => ['nullable', 'string', 'regex:/^((CR-)?[A-Z0-9]{6,14}|\d{7,14})$/i', 'max:30'],
            'registration_date' => 'nullable|date',
            'expiration_date' => 'nullable|date',
            'official_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'certificate_of_registration_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_date' => 'nullable|date',
        ], [
            'plate_number.regex' => 'The plate number must be in the format ABC-1234 (3 letters, hyphen, 4 numbers).',
            'insurance_policy_number.regex' => 'The policy number must be a valid format (e.g. POL-8921-X, 4-30 alphanumeric characters).',
            'or_number.regex' => 'The OR number must be valid (e.g. OR-8912401 or 7-18 alphanumeric characters).',
            'cr_number.regex' => 'The CR number must be valid (e.g. CR-1928401 or 7-14 alphanumeric characters).',
        ]);

        $fileFields = [
            'photo' => 'vehicles',
            'insurance_policy_file' => 'vehicles/documents',
            'official_receipt_file' => 'vehicles/documents',
            'certificate_of_registration_file' => 'vehicles/documents',
            'emission_certificate_file' => 'vehicles/documents',
        ];

        $data = $request->except(array_keys($fileFields));

        foreach ($fileFields as $field => $folder) {
            if ($request->hasFile($field)) {
                $old = $vehicle->$field;
                $data[$field] = $request->file($field)->store($folder, 'public');
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
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
        $fileFields = [
            'photo',
            'insurance_policy_file',
            'official_receipt_file',
            'certificate_of_registration_file',
            'emission_certificate_file',
        ];

        foreach ($fileFields as $field) {
            if ($vehicle->$field) {
                Storage::disk('public')->delete($vehicle->$field);
            }
        }

        $vehicle->delete();

        return response()->json([
            'message' => 'Vehicle deleted successfully.'
        ]);
    }
}