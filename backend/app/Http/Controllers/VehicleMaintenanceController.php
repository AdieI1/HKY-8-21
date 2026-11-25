<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartUsage;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VehicleMaintenanceController extends Controller
{
    public static function checkAndCompleteExpiredMaintenance()
    {
        try {
            $today = now()->toDateString();

            // 1. Expire and complete maintenance whose end date has passed, or single-day maintenance in past
            $expired = VehicleMaintenance::with('vehicle')
                ->whereIn('status', ['Scheduled', 'In Progress'])
                ->where(function ($query) use ($today) {
                    $query->where(function ($q) use ($today) {
                        $q->whereNotNull('next_maintenance_date')
                          ->where('next_maintenance_date', '<=', $today);
                    })->orWhere(function ($q) use ($today) {
                        $q->whereNull('next_maintenance_date')
                          ->where('maintenance_date', '<', $today);
                    });
                })
                ->get();

            foreach ($expired as $m) {
                $m->update(['status' => 'Completed']);
                if ($m->vehicle) {
                    // Find if there is any other active ongoing maintenance
                    $otherActive = VehicleMaintenance::where('vehicle_id', $m->vehicle_id)
                        ->where('maintenance_id', '!=', $m->maintenance_id)
                        ->whereIn('status', ['Scheduled', 'In Progress'])
                        ->where('maintenance_date', '<=', $today)
                        ->where(function ($q) use ($today) {
                            $q->whereNull('next_maintenance_date')
                              ->where('maintenance_date', '>=', $today)
                              ->orWhere(function ($sub) use ($today) {
                                  $sub->whereNotNull('next_maintenance_date')
                                      ->where('next_maintenance_date', '>', $today);
                              });
                        })
                        ->exists();

                    if (!$otherActive && $m->vehicle->status === 'maintenance') {
                        $m->vehicle->update([
                            'status' => 'available',
                            'last_maintenance_date' => $m->next_maintenance_date ?? $m->maintenance_date
                        ]);
                    }

                    AppNotification::notify(
                        'maintenance',
                        'Vehicle Maintenance Completed',
                        "Vehicle [{$m->vehicle->plate_number}] ({$m->vehicle->model}) has completed scheduled repairs and is now Available for dispatch.",
                        '/vehicles'
                    );
                }
            }

            // 2. Activate scheduled maintenance whose start date has arrived (and not yet expired)
            $activeNow = VehicleMaintenance::with('vehicle')
                ->where('status', 'Scheduled')
                ->where('maintenance_date', '<=', $today)
                ->where(function ($query) use ($today) {
                    $query->whereNull('next_maintenance_date')
                          ->where('maintenance_date', '=', $today)
                          ->orWhere(function ($q) use ($today) {
                              $q->whereNotNull('next_maintenance_date')
                                ->where('next_maintenance_date', '>', $today);
                          });
                })
                ->get();

            foreach ($activeNow as $activeM) {
                $activeM->update(['status' => 'In Progress']);
                if ($activeM->vehicle && !in_array($activeM->vehicle->status, ['maintenance', 'waiting_part_confirmation', 'in_use'])) {
                    $activeM->vehicle->update(['status' => 'maintenance']);
                }
            }
        } catch (\Throwable $e) {
            \Log::warning("checkAndCompleteExpiredMaintenance error: " . $e->getMessage());
        }
    }

    public function index(Request $request)
    {
        self::checkAndCompleteExpiredMaintenance();

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

        $targetVehicle = Vehicle::findOrFail($validated['vehicle_id']);
        if (in_array($targetVehicle->status, ['in_use', 'maintenance', 'waiting_part_confirmation'], true)) {
            $reason = match ($targetVehicle->status) {
                'in_use' => 'currently active on a delivery trip',
                'waiting_part_confirmation' => 'already waiting for maintenance parts confirmation',
                default => 'already under maintenance',
            };
            return response()->json([
                'message' => "Cannot schedule maintenance: vehicle is {$reason}.",
            ], 422);
        }

        // If part is selected, check inventory first (deduction happens upon Staff/Admin confirmation in Parts Inventory)
        $sparePart = null;
        $hasOptionalPart = !empty($validated['part_id']) && !empty($validated['quantity_used']);
        if ($hasOptionalPart) {
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

        $maintenance = DB::transaction(function () use ($validated, $sparePart, $hasOptionalPart, $cost, $request, $targetVehicle) {
            $initialStatus = $hasOptionalPart ? 'Waiting for Part Confirmation' : 'In Progress';
            $partsStatus = $hasOptionalPart ? 'pending' : 'not_required';

            $record = VehicleMaintenance::create([
                'vehicle_id' => $validated['vehicle_id'],
                'part_id' => $hasOptionalPart ? $validated['part_id'] : null,
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
                'status' => $initialStatus,
                'parts_status' => $partsStatus,
            ]);

            // When optional parts are requested, queue a pending parts issuance for confirmation (do NOT deduct stock yet)
            if ($hasOptionalPart && $sparePart) {
                $qtyUsed = (int) $validated['quantity_used'];

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
                    'status' => 'pending',
                    'used_date' => $validated['maintenance_date'],
                ]);
            }

            $vehicle = $targetVehicle->fresh();
            if ($vehicle) {
                $vehicle->status = $hasOptionalPart ? 'waiting_part_confirmation' : 'maintenance';
                $vehicle->next_maintenance_date = $validated['next_maintenance_date'] ?? $validated['maintenance_date'];
                $vehicle->save();
            }

            return $record;
        });

        $vModel = $maintenance->vehicle?->model ?: 'Vehicle';
        $vPlate = $maintenance->vehicle?->plate_number ?: '';
        if ($hasOptionalPart && $sparePart) {
            AppNotification::notify(
                'parts',
                'Maintenance Parts Confirmation Required',
                "{$vModel} ({$vPlate}) needs {$validated['quantity_used']}x {$sparePart->part_name} for {$maintenance->maintenance_type}. Confirm parts release in Parts Inventory.",
                '/parts-inventory'
            );
            AppNotification::notify(
                'maintenance',
                'Waiting for Part Confirmation',
                "{$maintenance->maintenance_type} scheduled for {$vModel} ({$vPlate}) is waiting for parts confirmation.",
                '/vehicles'
            );
        } else {
            AppNotification::notify(
                'maintenance',
                'Vehicle Under Maintenance',
                "{$maintenance->maintenance_type} started for {$vModel} ({$vPlate}). Vehicle is now Under Maintenance.",
                '/vehicles'
            );
        }

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

    public function cancel(Request $request, VehicleMaintenance $vehicleMaintenance)
    {
        if ($vehicleMaintenance->status !== 'Waiting for Part Confirmation') {
            return response()->json([
                'message' => 'Only maintenance schedules waiting for part confirmation can be cancelled.',
            ], 422);
        }

        $reason = trim((string) $request->input('reason', ''));

        $updated = DB::transaction(function () use ($vehicleMaintenance, $reason, $request) {
            SparePartUsage::where('maintenance_id', $vehicleMaintenance->maintenance_id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'cancelled',
                    'confirmed_by' => $request->user()?->user_id,
                    'confirmed_at' => now(),
                    'notes' => $reason ?: 'Cancelled from Vehicles before parts confirmation (no stock deducted).',
                ]);

            $noteLine = $reason ? "Cancelled: {$reason}" : 'Cancelled while waiting for part confirmation.';
            $vehicleMaintenance->update([
                'status' => 'Cancelled',
                'parts_status' => 'cancelled',
                'notes' => trim(($vehicleMaintenance->notes ? $vehicleMaintenance->notes . "\n" : '') . $noteLine),
            ]);

            $vehicle = $vehicleMaintenance->vehicle;
            if ($vehicle && $vehicle->status === 'waiting_part_confirmation') {
                $nextScheduled = VehicleMaintenance::where('vehicle_id', $vehicle->vehicle_id)
                    ->where('maintenance_id', '!=', $vehicleMaintenance->maintenance_id)
                    ->whereIn('status', ['Scheduled', 'In Progress', 'Waiting for Part Confirmation'])
                    ->where('maintenance_date', '>=', now()->toDateString())
                    ->orderBy('maintenance_date', 'asc')
                    ->value('maintenance_date');

                $restoredStatus = strtolower((string) $vehicle->condition) === 'need repair' ? 'broken' : 'available';
                $vehicle->update([
                    'status' => $restoredStatus,
                    'next_maintenance_date' => $nextScheduled,
                ]);
            }

            return $vehicleMaintenance->fresh()->load(['vehicle', 'part', 'maintainer', 'partsUsages.part']);
        });

        $vModel = $updated->vehicle?->model ?: 'Vehicle';
        AppNotification::notify(
            'maintenance',
            'Pending Maintenance Cancelled',
            "Pending maintenance for {$vModel} ({$updated->maintenance_type}) was cancelled before parts confirmation. Vehicle is available again.",
            '/vehicles'
        );

        return response()->json([
            'message' => 'Pending maintenance cancelled (audit history preserved) and vehicle released.',
            'maintenance' => $updated,
        ]);
    }

    public function destroy(VehicleMaintenance $vehicleMaintenance)
    {
        return response()->json([
            'message' => 'Maintenance records are preserved for audit history and cannot be deleted. Cancel pending schedules instead.',
        ], 422);
    }
}