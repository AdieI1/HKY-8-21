<?php

namespace App\Http\Controllers;

use App\Models\FuelInventory;
use App\Models\FuelIssuance;
use App\Models\FuelPriceHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelInventoryController extends Controller
{
    public function index()
    {
        return FuelInventory::with(['issuances.vehicle', 'issuances.issuedBy', 'issuances.receivedBy', 'priceHistories.changedBy'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fuel_type' => 'required|string|max:50',
            'supplier_name' => 'nullable|string|max:100',
            'current_stock' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'last_delivery_date' => 'nullable|date',
        ]);

        $fuel = FuelInventory::create($validated);

        if (!empty($validated['unit_price']) && $validated['unit_price'] > 0) {
            FuelPriceHistory::create([
                'fuel_id' => $fuel->fuel_id,
                'previous_price' => 0,
                'new_price' => $validated['unit_price'],
                'changed_by' => $request->user()?->user_id,
                'created_at' => now(),
            ]);
        }

        return $fuel;
    }

    public function show(FuelInventory $fuelInventory)
    {
        return $fuelInventory->load([
            'issuances.vehicle',
            'issuances.driver.user',
            'issuances.issuedBy',
            'issuances.receivedBy',
            'priceHistories.changedBy',
        ]);
    }

    public function update(Request $request, FuelInventory $fuelInventory)
    {
        $validated = $request->validate([
            'fuel_type' => 'sometimes|required|string|max:50',
            'supplier_name' => 'nullable|string|max:100',
            'current_stock' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'last_delivery_date' => 'nullable|date',
        ]);

        $oldPrice = (float) $fuelInventory->unit_price;
        $newPrice = isset($validated['unit_price']) ? (float) $validated['unit_price'] : $oldPrice;

        if (isset($validated['unit_price']) && $oldPrice != $newPrice) {
            FuelPriceHistory::create([
                'fuel_id' => $fuelInventory->fuel_id,
                'previous_price' => $oldPrice,
                'new_price' => $newPrice,
                'changed_by' => $request->user()?->user_id,
                'created_at' => now(),
            ]);
        }

        $fuelInventory->update($validated);

        return $fuelInventory->fresh()->load(['priceHistories.changedBy', 'issuances.vehicle']);
    }

    /**
     * Receive fuel (Fuel In transaction)
     */
    public function receive(Request $request, FuelInventory $fuelInventory)
    {
        $validated = $request->validate([
            'liters' => 'required|numeric|min:0.01',
            'supplier_name' => 'nullable|string|max:100',
            'unit_price' => 'nullable|numeric|min:0',
            'received_date' => 'nullable|date',
        ]);

        $liters = (float) $validated['liters'];
        $unitPrice = isset($validated['unit_price']) && $validated['unit_price'] !== ''
            ? (float) $validated['unit_price']
            : (float) $fuelInventory->unit_price;
        $totalVal = round($liters * $unitPrice, 2);
        $oldPrice = (float) $fuelInventory->unit_price;

        $transaction = DB::transaction(function () use ($fuelInventory, $validated, $liters, $unitPrice, $totalVal, $oldPrice, $request) {
            // Track price change if different
            if ($unitPrice > 0 && $oldPrice != $unitPrice) {
                FuelPriceHistory::create([
                    'fuel_id' => $fuelInventory->fuel_id,
                    'previous_price' => $oldPrice,
                    'new_price' => $unitPrice,
                    'changed_by' => $request->user()?->user_id,
                    'created_at' => now(),
                ]);
            }

            $fuelInventory->update([
                'current_stock' => $fuelInventory->current_stock + $liters,
                'supplier_name' => $validated['supplier_name'] ?? $fuelInventory->supplier_name,
                'unit_price' => $unitPrice,
                'last_delivery_date' => $validated['received_date'] ?? now()->toDateString(),
            ]);

            return FuelIssuance::create([
                'fuel_id' => $fuelInventory->fuel_id,
                'transaction_type' => 'in',
                'supplier_name' => $validated['supplier_name'] ?? $fuelInventory->supplier_name,
                'received_by' => $request->user()?->user_id,
                'liters' => $liters,
                'unit_price' => $unitPrice,
                'total_value' => $totalVal,
                'purpose' => 'Received from supplier: ' . ($validated['supplier_name'] ?? $fuelInventory->supplier_name ?: 'Supplier'),
                'issued_at' => !empty($validated['received_date']) ? \Carbon\Carbon::parse($validated['received_date']) : now(),
            ]);
        });

        return response()->json([
            'message' => 'Fuel received successfully.',
            'fuel' => $fuelInventory->fresh()->load(['issuances.vehicle', 'issuances.receivedBy', 'priceHistories.changedBy']),
            'transaction' => $transaction->load(['fuel', 'receivedBy']),
        ]);
    }

    /**
     * Issue fuel (Fuel Out transaction)
     */
    public function issue(Request $request, FuelInventory $fuelInventory)
    {
        $validated = $request->validate([
            'liters' => 'required|numeric|min:0.01',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'driver_id' => 'nullable|exists:drivers,driver_id',
            'purpose' => 'nullable|string|max:1000',
            'unit_price' => 'nullable|numeric|min:0',
            'issue_date' => 'nullable|date',
        ]);

        $liters = (float) $validated['liters'];

        if ($liters > $fuelInventory->current_stock) {
            return response()->json([
                'message' => 'Insufficient stock — only ' . $fuelInventory->current_stock . ' ' . $fuelInventory->unit . ' available in tank.',
            ], 422);
        }

        $unitPrice = isset($validated['unit_price']) && $validated['unit_price'] !== ''
            ? (float) $validated['unit_price']
            : (float) $fuelInventory->unit_price;
        $totalVal = round($liters * $unitPrice, 2);

        $issuance = DB::transaction(function () use ($request, $fuelInventory, $validated, $liters, $unitPrice, $totalVal) {
            $fuelInventory->update([
                'current_stock' => $fuelInventory->current_stock - $liters,
            ]);

            return FuelIssuance::create([
                'fuel_id' => $fuelInventory->fuel_id,
                'transaction_type' => 'out',
                'vehicle_id' => $validated['vehicle_id'] ?? null,
                'driver_id' => $validated['driver_id'] ?? null,
                'issued_by' => $request->user()?->user_id,
                'liters' => $liters,
                'unit_price' => $unitPrice,
                'total_value' => $totalVal,
                'purpose' => !empty($validated['purpose']) ? $validated['purpose'] : 'Vehicle refueling / Fuel Out',
                'issued_at' => !empty($validated['issue_date']) ? \Carbon\Carbon::parse($validated['issue_date']) : now(),
            ]);
        });

        return response()->json([
            'message' => 'Fuel issued successfully.',
            'fuel' => $fuelInventory->fresh()->load(['issuances.vehicle', 'issuances.issuedBy', 'priceHistories.changedBy']),
            'transaction' => $issuance->load(['fuel', 'vehicle', 'driver.user', 'issuedBy']),
        ]);
    }

    public function destroy(FuelInventory $fuelInventory)
    {
        $fuelInventory->delete();

        return response()->json([
            'message' => 'Fuel type deleted successfully.'
        ]);
    }
}