<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartUsage;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SparePartsUsageController extends Controller
{
    public function index(Request $request)
    {
        $query = SparePartUsage::with([
            'permit',
            'part',
            'vehicle',
            'maintenance.vehicle',
            'user',
            'confirmer',
        ])->where(function ($q) {
            $q->where('status', 'confirmed')->orWhereNull('status');
        });

        if ($request->filled('part_id')) {
            $query->where('part_id', $request->part_id);
        }

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        return $query->orderByDesc('used_date')->orderByDesc('usage_id')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'part_id' => 'required|exists:spare_parts,part_id',
            'quantity_used' => 'required|integer|min:1',
            'transaction_type' => 'nullable|in:in,out',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'maintenance_id' => 'nullable|exists:vehicle_maintenance,maintenance_id',
            'permit_id' => 'nullable|exists:permits,permit_id',
            'supplier_name' => 'nullable|string|max:100',
            'purpose' => 'nullable|string|max:255',
            'used_date' => 'required|date',
        ]);

        $part = SparePart::findOrFail($validated['part_id']);
        $type = $validated['transaction_type'] ?? 'out';
        $qty = (int) $validated['quantity_used'];

        if ($type === 'out' && $qty > $part->quantity_in_stock) {
            return response()->json([
                'message' => 'Insufficient stock available! Current stock: ' . $part->quantity_in_stock . ' ' . ($part->unit ?: 'pcs') . ', requested: ' . $qty
            ], 422);
        }

        $transaction = DB::transaction(function () use ($part, $validated, $type, $qty, $request) {
            if ($type === 'in') {
                $part->increment('quantity_in_stock', $qty);
                if (!empty($validated['supplier_name'])) {
                    $part->supplier_name = $validated['supplier_name'];
                }
            } else {
                $part->decrement('quantity_in_stock', $qty);
            }
            $part->refresh();
            $part->save(); // Automatically updates status

            $tx = SparePartUsage::create([
                'part_id' => $part->part_id,
                'transaction_type' => $type,
                'vehicle_id' => $validated['vehicle_id'] ?? null,
                'maintenance_id' => $validated['maintenance_id'] ?? null,
                'permit_id' => $validated['permit_id'] ?? null,
                'user_id' => $request->user()?->user_id,
                'supplier_name' => $validated['supplier_name'] ?? $part->supplier_name,
                'quantity_used' => $qty,
                'unit_price' => $part->unit_price,
                'total_value' => round($qty * ($part->unit_price ?? 0), 2),
                'purpose' => $validated['purpose'] ?? ($type === 'in' ? 'Parts Received / In' : 'Parts Issued / Out'),
                'status' => 'confirmed',
                'confirmed_by' => $request->user()?->user_id,
                'confirmed_at' => now(),
                'used_date' => $validated['used_date'],
            ]);
            $tx->update(['transaction_no' => sprintf('PTX-%05d', $tx->usage_id)]);
            return $tx;
        });

        $part = SparePart::find($transaction->part_id);
        $partName = $part?->part_name ?: 'Part';
        if ($transaction->transaction_type === 'out') {
            AppNotification::notify('parts', 'Spare Part Issued', "Used {$transaction->quantity_used}x of {$partName}.", '/parts-inventory');
            if ($part && $part->quantity_in_stock <= $part->reorder_level) {
                AppNotification::notify('inventory_alert', 'Low Stock Warning', "{$partName} stock is low ({$part->quantity_in_stock} {$part->unit} left).", '/parts-inventory');
            }
        } else {
            AppNotification::notify('parts', 'Spare Parts Restocked', "Received {$transaction->quantity_used}x of {$partName}.", '/parts-inventory');
        }

        return response()->json(
            $transaction->load(['permit', 'part', 'vehicle', 'maintenance', 'user']),
            201
        );
    }

    public function pending()
    {
        return SparePartUsage::with([
            'part',
            'vehicle',
            'maintenance.vehicle',
            'user',
        ])
            ->where('status', 'pending')
            ->orderByDesc('usage_id')
            ->get();
    }

    public function confirm(Request $request, SparePartUsage $sparePartsUsage)
    {
        if ($sparePartsUsage->status !== 'pending') {
            return response()->json([
                'message' => 'This parts issuance request has already been processed.',
            ], 422);
        }

        $validated = $request->validate([
            'part_id' => 'nullable|exists:spare_parts,part_id',
        ]);

        $targetPartId = $validated['part_id'] ?? $sparePartsUsage->part_id;
        $qty = (int) $sparePartsUsage->quantity_used;

        try {
            $result = DB::transaction(function () use ($request, $sparePartsUsage, $targetPartId, $qty) {
                $part = SparePart::lockForUpdate()->findOrFail($targetPartId);

                if ((int) $part->quantity_in_stock < $qty) {
                    throw new \RuntimeException(
                        "Insufficient {$part->part_name} stock ({$part->quantity_in_stock} " . ($part->unit ?: 'pcs') . " available, {$qty} requested). Restock first before confirming."
                    );
                }

                $part->decrement('quantity_in_stock', $qty);
                $part->refresh();
                $part->status = SparePart::determineStatus($part->quantity_in_stock, $part->reorder_level);
                $part->save();

                $txNo = sprintf('PTX-%05d', $sparePartsUsage->usage_id);
                $unitPrice = (float) ($part->unit_price ?? $sparePartsUsage->unit_price ?? 0);
                $totalValue = round($qty * $unitPrice, 2);
                $confirmerId = $request->user()?->user_id ?? $sparePartsUsage->user_id;

                $sparePartsUsage->update([
                    'part_id' => $part->part_id,
                    'transaction_no' => $txNo,
                    'unit_price' => $unitPrice,
                    'total_value' => $totalValue,
                    'status' => 'confirmed',
                    'confirmed_by' => $confirmerId,
                    'confirmed_at' => now(),
                    'used_date' => now()->toDateString(),
                ]);

                $maintenance = $sparePartsUsage->maintenance;
                if ($maintenance) {
                    $maintenance->update([
                        'part_id' => $part->part_id,
                        'status' => 'In Progress',
                        'parts_status' => 'confirmed',
                        'parts_transaction_no' => $txNo,
                    ]);

                    if ($maintenance->vehicle) {
                        $maintenance->vehicle->update(['status' => 'maintenance']);
                    }

                    $vModel = $maintenance->vehicle?->model ?: 'Vehicle';
                    $vPlate = $maintenance->vehicle?->plate_number ?: '';
                    AppNotification::notify(
                        'maintenance',
                        "Parts Issued & Under Maintenance ({$txNo})",
                        "{$qty}x {$part->part_name} issued ({$txNo}) for {$vModel} ({$vPlate}). Vehicle is now Under Maintenance.",
                        '/vehicles'
                    );
                }

                if ($part->reorder_level !== null && (int) $part->quantity_in_stock <= (int) $part->reorder_level) {
                    AppNotification::notify(
                        'inventory_alert',
                        'Low Stock Warning',
                        "{$part->part_name} stock dropped to {$part->quantity_in_stock} " . ($part->unit ?: 'pcs') . " after transaction {$txNo}.",
                        '/parts-inventory'
                    );
                }

                return [
                    'transaction_no' => $txNo,
                    'transaction' => $sparePartsUsage->fresh()->load(['permit', 'part', 'vehicle', 'maintenance.vehicle', 'user', 'confirmer']),
                    'part' => $part->fresh(),
                ];
            });

            return response()->json(array_merge([
                'message' => "Parts issued ({$result['transaction_no']})! Stock deducted and vehicle moved to Under Maintenance.",
            ], $result));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function useExternal(Request $request, SparePartUsage $sparePartsUsage)
    {
        if ($sparePartsUsage->status !== 'pending') {
            return response()->json([
                'message' => 'This parts issuance request has already been processed.',
            ], 422);
        }

        $reason = trim((string) $request->input('notes', ''));
        $noteText = $reason ?: 'External / outside-purchased parts used; warehouse stock not deducted.';

        $maintenance = DB::transaction(function () use ($request, $sparePartsUsage, $noteText) {
            $sparePartsUsage->update([
                'status' => 'external',
                'confirmed_by' => $request->user()?->user_id,
                'confirmed_at' => now(),
                'notes' => $noteText,
            ]);

            $maintenance = $sparePartsUsage->maintenance;
            if ($maintenance) {
                $maintenance->update([
                    'status' => 'In Progress',
                    'parts_status' => 'external',
                    'notes' => trim(($maintenance->notes ? $maintenance->notes . "\n" : '') . $noteText),
                ]);

                if ($maintenance->vehicle) {
                    $maintenance->vehicle->update(['status' => 'maintenance']);
                }

                $vModel = $maintenance->vehicle?->model ?: 'Vehicle';
                $vPlate = $maintenance->vehicle?->plate_number ?: '';
                AppNotification::notify(
                    'maintenance',
                    'Maintenance Started (External Parts)',
                    "{$vModel} ({$vPlate}) moved to Under Maintenance using external parts (no inventory deducted).",
                    '/vehicles'
                );
            }

            return $maintenance?->fresh()->load(['vehicle', 'part', 'maintainer', 'partsUsages.part']);
        });

        return response()->json([
            'message' => 'Maintenance moved to Under Maintenance using external parts (no inventory stock deducted).',
            'maintenance' => $maintenance,
        ]);
    }

    public function show(SparePartUsage $sparePartsUsage)
    {
        return $sparePartsUsage->load(['permit', 'part', 'vehicle', 'maintenance.vehicle', 'user', 'confirmer']);
    }

    public function update(Request $request, SparePartUsage $sparePartsUsage)
    {
        $sparePartsUsage->update($request->all());

        return $sparePartsUsage->load(['permit', 'part', 'vehicle', 'maintenance', 'user']);
    }

    public function destroy(SparePartUsage $sparePartsUsage)
    {
        $sparePartsUsage->delete();

        return response()->json([
            'message' => 'Transaction record deleted.'
        ]);
    }
}