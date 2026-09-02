<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartUsage;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VehicleMaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $query = VehicleMaintenance::with([
            'vehicle',
            'part',
            'maintainer',
            'partsUsages.part',
        ]);

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->orderByDesc('maintenance_date')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,vehicle_id',
            'maintenance_type' => 'required|string|max:100',
            'maintenance_date' => 'required|date',
            'maintenance_cost' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'maintained_by_name' => 'nullable|string|max:150',
            'maintained_by' => 'nullable|exists:users,user_id',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'odometer_at_service' => 'nullable|numeric',
            'next_maintenance_date' => 'nullable|date',

            // Optional parts usage
            'part_id' => 'nullable|exists:spare_parts,part_id',
            'quantity_used' => 'nullable|integer|min:1',
        ]);

        // If part is selected, check inventory first
        $sparePart = null;
        if (!empty($validated['part_id']) && !empty($validated['quantity_used'])) {
            $sparePart = SparePart::find($validated['part_id']);
            if (!$sparePart) {
                return response()->json(['message' => 'Selected spare part not found.'], 404);
            }
            if ($sparePart->quantity_in_stock < $validated['quantity_used']) {
                return response()->json([
                    'message' => 'Insufficient stock available! Current stock for ' . $sparePart->part_name . ' is ' . $sparePart->quantity_in_stock . ' ' . ($sparePart->unit ?: 'pcs') . ', but ' . $validated['quantity_used'] . ' was requested.'
                ], 422);
            }
        }

        $cost = $validated['maintenance_cost'] ?? $validated['total_cost'] ?? 0;

        $maintenance = DB::transaction(function () use ($validated, $sparePart, $cost, $request) {
            $record = VehicleMaintenance::create([
                'vehicle_id' => $validated['vehicle_id'],
                'part_id' => $validated['part_id'] ?? null,
                'maintained_by' => $validated['maintained_by'] ?? $request->user()?->user_id,
                'maintained_by_name' => $validated['maintained_by_name'] ?? null,
                'maintenance_type' => $validated['maintenance_type'],
                'description' => $validated['description'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'maintenance_date' => $validated['maintenance_date'],
                'next_maintenance_date' => $validated['next_maintenance_date'] ?? null,
                'maintenance_cost' => $cost,
                'total_cost' => $cost,
                'odometer_at_service' => $validated['odometer_at_service'] ?? null,
                'status' => $validated['status'] ?? 'Scheduled',
            ]);

            // Deduct spare part stock and log parts out transaction
            if ($sparePart && !empty($validated['quantity_used'])) {
                $qtyUsed = (int) $validated['quantity_used'];
                $sparePart->decrement('quantity_in_stock', $qtyUsed);
                $sparePart->refresh();
                $sparePart->save(); // Triggers status recalculation

                SparePartUsage::create([
                    'part_id' => $sparePart->part_id,
                    'transaction_type' => 'out',
                    'vehicle_id' => $validated['vehicle_id'],
                    'maintenance_id' => $record->maintenance_id,
                    'user_id' => $request->user()?->user_id,
                    'quantity_used' => $qtyUsed,
                    'unit_price' => $sparePart->unit_price,
                    'total_value' => round($qtyUsed * ($sparePart->unit_price ?? 0), 2),
                    'purpose' => 'Maintenance: ' . $validated['maintenance_type'] . ' (' . ($record->maintained_by_name ?: 'Internal') . ')',
                    'used_date' => $validated['maintenance_date'],
                ]);
            }

            // Update vehicle maintenance dates dynamically
            $vehicle = Vehicle::find($validated['vehicle_id']);
            if ($vehicle) {
                if (in_array($record->status, ['Scheduled', 'In Progress'])) {
                    $vehicle->next_maintenance_date = $validated['maintenance_date'];
                    // If last_maintenance_date was mistakenly set to this scheduled date, clear it or keep real completed date
                    if ($vehicle->last_maintenance_date === $validated['maintenance_date']) {
                        $lastCompleted = VehicleMaintenance::where('vehicle_id', $vehicle->vehicle_id)
                            ->where('status', 'Completed')
                            ->orderByDesc('maintenance_date')
                            ->value('maintenance_date');
                        $vehicle->last_maintenance_date = $lastCompleted;
                    }
                } elseif ($record->status === 'Completed') {
                    $vehicle->last_maintenance_date = $validated['maintenance_date'];
                    // Find next upcoming scheduled maintenance if any
                    $nextScheduled = VehicleMaintenance::where('vehicle_id', $vehicle->vehicle_id)
                        ->whereIn('status', ['Scheduled', 'In Progress'])
                        ->where('maintenance_date', '>=', now()->toDateString())
                        ->orderBy('maintenance_date', 'asc')
                        ->value('maintenance_date');
                    $vehicle->next_maintenance_date = $nextScheduled;
                }
                $vehicle->save();
            }

            return $record;
        });

        return response()->json(
            $maintenance->load(['vehicle', 'part', 'maintainer', 'partsUsages.part']),
            201
        );
    }

    public function show(VehicleMaintenance $vehicleMaintenance)
    {
        return $vehicleMaintenance->load(['vehicle', 'part', 'maintainer', 'partsUsages.part']);
    }

    public function update(Request $request, VehicleMaintenance $vehicleMaintenance)
    {
        $validated = $request->validate([
            'status' => 'nullable|string|max:50',
            'maintenance_type' => 'nullable|string|max:100',
            'maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'maintenance_cost' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'maintained_by_name' => 'nullable|string|max:150',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $vehicleMaintenance->update($validated);

        return $vehicleMaintenance->fresh()->load(['vehicle', 'part', 'maintainer', 'partsUsages.part']);
    }

    public function destroy(VehicleMaintenance $vehicleMaintenance)
    {
        $vehicleMaintenance->delete();

        return response()->json([
            'message' => 'Maintenance record deleted successfully.'
        ]);
    }
}