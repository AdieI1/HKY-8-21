<?php

namespace App\Http\Controllers;

use App\Models\FuelInventory;
use App\Models\FuelIssuance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelInventoryController extends Controller
{
    public function index()
    {
        return FuelInventory::all();
    }

    public function store(Request $request)
    {
        $request->validate([
            'fuel_type' => 'required|string|max:50',
            'supplier_name' => 'nullable|string|max:100',
            'current_stock' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'last_delivery_date' => 'nullable|date',
        ]);

        return FuelInventory::create($request->all());
    }

    public function show(FuelInventory $fuelInventory)
    {
        return $fuelInventory->load('issuances');
    }

    public function update(Request $request, FuelInventory $fuelInventory)
    {
        $fuelInventory->update($request->all());

        return $fuelInventory;
    }

    /**
     * Adds stock from a fuel delivery — increases current_stock and
     * records the delivery date/supplier/price.
     */
    public function receive(Request $request, FuelInventory $fuelInventory)
    {
        $request->validate([
            'liters' => 'required|numeric|min:0.01',
            'supplier_name' => 'nullable|string|max:100',
            'unit_price' => 'nullable|numeric|min:0',
        ]);

        $fuelInventory->update([
            'current_stock' => $fuelInventory->current_stock + $request->liters,
            'supplier_name' => $request->supplier_name ?? $fuelInventory->supplier_name,
            'unit_price' => $request->unit_price ?? $fuelInventory->unit_price,
            'last_delivery_date' => now()->toDateString(),
        ]);

        return $fuelInventory->fresh();
    }

    /**
     * Issues fuel to a vehicle/driver — deducts current_stock and logs
     * the issuance for the history table.
     */
    public function issue(Request $request, FuelInventory $fuelInventory)
    {
        $request->validate([
            'liters' => 'required|numeric|min:0.01',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'driver_id' => 'nullable|exists:drivers,driver_id',
            'purpose' => 'nullable|string|max:100',
        ]);

        if ($request->liters > $fuelInventory->current_stock) {
            return response()->json([
                'message' => 'Not enough stock — only ' . $fuelInventory->current_stock . ' ' . $fuelInventory->unit . ' available.',
            ], 422);
        }

        $issuance = DB::transaction(function () use ($request, $fuelInventory) {
            $fuelInventory->update([
                'current_stock' => $fuelInventory->current_stock - $request->liters,
            ]);

            return FuelIssuance::create([
                'fuel_id' => $fuelInventory->fuel_id,
                'vehicle_id' => $request->vehicle_id,
                'driver_id' => $request->driver_id,
                'issued_by' => $request->user()?->user_id,
                'liters' => $request->liters,
                'purpose' => $request->purpose,
                'issued_at' => now(),
            ]);
        });

        return $issuance->load(['fuel', 'vehicle', 'driver.user', 'issuedBy']);
    }

    public function destroy(FuelInventory $fuelInventory)
    {
        $fuelInventory->delete();

        return response()->json([
            'message' => 'Fuel type deleted successfully.'
        ]);
    }
}