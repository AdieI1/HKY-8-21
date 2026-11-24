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
        $fieldsToUppercase = ['plate_number', 'engine_number', 'chassis_number', 'vehicle_category', 'insurance_policy_number', 'or_number', 'cr_number'];
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
            'engine_number' => ['required', 'string', 'min:10', 'max:14', 'regex:/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,6}-\d{6,7}$/', 'unique:vehicles,engine_number'],
            'chassis_number' => ['required', 'string', 'min:10', 'max:17', 'regex:/^(?:[A-Z]{2,4}[A-Z0-9]{1,4}-\d{5,7}|(?=.*[A-Z])(?=.*\d)[A-HJ-NPR-Z0-9]{17})$/', 'unique:vehicles,chassis_number'],
            'model' => 'required|string|max:100',
            'brand' => 'nullable|string|max:100',
            'year_model' => 'nullable|integer',
            'vehicle_type' => 'required|string|max:50',
            'classification' => 'nullable|string|max:50',
            'vehicle_category' => 'nullable|string|max:20',
            'body_type' => 'nullable|string|max:80',
            'color' => 'required|string|max:50',
            'capacity' => 'nullable|numeric',
            'passenger_capacity' => 'nullable|integer|min:1|max:60',
            'mileage' => 'nullable|numeric',
            'odometer_reading' => 'nullable|numeric',
            'fuel_type' => 'required|in:diesel,gasoline,electric,hybrid',
            'condition' => 'nullable|string|max:30',
            'registration_valid_from' => 'nullable|date',
            'registration_valid_until' => 'nullable|date|after:today',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'nullable|in:available,in_use,maintenance,broken,decommissioned',
            'insurance_provider' => 'nullable|string|max:150',
            'insurance_policy_number' => ['nullable', 'string', 'min:8', 'max:30', 'regex:/^(?=(?:.*\d){4,})[A-Z]{2,5}(?:-[A-Z0-9]{1,10}){1,6}$/', 'unique:vehicles,insurance_policy_number'],
            'insurance_coverage_type' => 'nullable|string|max:100',
            'insurance_valid_from' => 'nullable|date',
            'insurance_valid_until' => 'nullable|date|after:today',
            'insurance_policy_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'or_number' => ['nullable', 'string', 'regex:/^(?:\d{4}-\d{12}|\d{8,16})$/', 'max:17', 'unique:vehicles,or_number'],
            'cr_number' => ['nullable', 'string', 'regex:/^(?:\d{8,10}|\d{8,9}-\d|\d{4}-\d{2}-\d{9})$/', 'max:17', 'unique:vehicles,cr_number'],
            'registration_date' => 'nullable|date',
            'expiration_date' => 'nullable|date|after:today',
            'official_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'certificate_of_registration_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_date' => 'nullable|date',
        ], [
            'plate_number.regex' => 'The plate number must be in the format ABC-1234 (3 letters, hyphen, 4 numbers).',
            'engine_number.regex' => 'Engine number must follow truck format CODE-123456 (10–14 chars, e.g. 8M22-025168).',
            'engine_number.unique' => 'This engine number is already registered to another vehicle.',
            'chassis_number.regex' => 'Chassis number must follow truck frame format (e.g. FV50LH-520103) or a valid 17-character VIN.',
            'chassis_number.unique' => 'This chassis number is already registered to another vehicle.',
            'insurance_policy_number.regex' => 'Policy number must follow Philippine truck insurance format (e.g. MC-CV-26-0014614 or MTR-TH-26-000985-00).',
            'insurance_policy_number.unique' => 'This insurance policy number is already registered to another vehicle.',
            'or_number.regex' => 'OR number must be 8–16 digits or LTMS format (e.g. 038925000007757 or 1001-000000222188).',
            'or_number.unique' => 'This OR number is already registered to another vehicle.',
            'cr_number.regex' => 'CR number must be a valid LTO CR number (e.g. 0098260263, 29254032-3, or 1001-24-699000111).',
            'cr_number.unique' => 'This CR number is already registered to another vehicle.',
            'insurance_valid_until.after' => 'Insurance expiry date must be strictly after today (tomorrow onward).',
            'expiration_date.after' => 'Registration expiration date must be strictly after today (tomorrow onward).',
            'registration_valid_until.after' => 'Registration expiration date must be strictly after today (tomorrow onward).',
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
        $fieldsToUppercase = ['plate_number', 'engine_number', 'chassis_number', 'vehicle_category', 'insurance_policy_number', 'or_number', 'cr_number'];
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
            'engine_number' => ['nullable', 'string', 'min:10', 'max:14', 'regex:/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{3,6}-\d{6,7}$/', 'unique:vehicles,engine_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'chassis_number' => ['nullable', 'string', 'min:10', 'max:17', 'regex:/^(?:[A-Z]{2,4}[A-Z0-9]{1,4}-\d{5,7}|(?=.*[A-Z])(?=.*\d)[A-HJ-NPR-Z0-9]{17})$/', 'unique:vehicles,chassis_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'classification' => 'nullable|string|max:50',
            'vehicle_category' => 'nullable|string|max:20',
            'body_type' => 'nullable|string|max:80',
            'passenger_capacity' => 'nullable|integer|min:1|max:60',
            'fuel_type' => 'sometimes|in:diesel,gasoline,electric,hybrid',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'sometimes|in:available,in_use,maintenance,broken,decommissioned',
            'odometer_reading' => 'nullable|numeric|min:0',
            'insurance_provider' => 'nullable|string|max:150',
            'insurance_policy_number' => ['nullable', 'string', 'min:8', 'max:30', 'regex:/^(?=(?:.*\d){4,})[A-Z]{2,5}(?:-[A-Z0-9]{1,10}){1,6}$/', 'unique:vehicles,insurance_policy_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'insurance_coverage_type' => 'nullable|string|max:100',
            'insurance_valid_from' => 'nullable|date',
            'insurance_valid_until' => 'nullable|date|after:today',
            'insurance_policy_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'or_number' => ['nullable', 'string', 'regex:/^(?:\d{4}-\d{12}|\d{8,16})$/', 'max:17', 'unique:vehicles,or_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'cr_number' => ['nullable', 'string', 'regex:/^(?:\d{8,10}|\d{8,9}-\d|\d{4}-\d{2}-\d{9})$/', 'max:17', 'unique:vehicles,cr_number,' . $vehicle->vehicle_id . ',vehicle_id'],
            'registration_date' => 'nullable|date',
            'expiration_date' => 'nullable|date|after:today',
            'registration_valid_until' => 'nullable|date|after:today',
            'official_receipt_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'certificate_of_registration_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'emission_date' => 'nullable|date',
        ], [
            'plate_number.regex' => 'The plate number must be in the format ABC-1234 (3 letters, hyphen, 4 numbers).',
            'engine_number.regex' => 'Engine number must follow truck format CODE-123456 (10–14 chars, e.g. 8M22-025168).',
            'engine_number.unique' => 'This engine number is already registered to another vehicle.',
            'chassis_number.regex' => 'Chassis number must follow truck frame format (e.g. FV50LH-520103) or a valid 17-character VIN.',
            'chassis_number.unique' => 'This chassis number is already registered to another vehicle.',
            'insurance_policy_number.regex' => 'Policy number must follow Philippine truck insurance format (e.g. MC-CV-26-0014614 or MTR-TH-26-000985-00).',
            'insurance_policy_number.unique' => 'This insurance policy number is already registered to another vehicle.',
            'or_number.regex' => 'OR number must be 8–16 digits or LTMS format (e.g. 038925000007757 or 1001-000000222188).',
            'or_number.unique' => 'This OR number is already registered to another vehicle.',
            'cr_number.regex' => 'CR number must be a valid LTO CR number (e.g. 0098260263, 29254032-3, or 1001-24-699000111).',
            'cr_number.unique' => 'This CR number is already registered to another vehicle.',
            'insurance_valid_until.after' => 'Insurance expiry date must be strictly after today (tomorrow onward).',
            'expiration_date.after' => 'Registration expiration date must be strictly after today (tomorrow onward).',
            'registration_valid_until.after' => 'Registration expiration date must be strictly after today (tomorrow onward).',
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