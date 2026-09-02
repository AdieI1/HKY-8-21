<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartUsage;
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
        ]);

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

            return SparePartUsage::create([
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
                'used_date' => $validated['used_date'],
            ]);
        });

        return response()->json(
            $transaction->load(['permit', 'part', 'vehicle', 'maintenance', 'user']),
            201
        );
    }

    public function show(SparePartUsage $sparePartsUsage)
    {
        return $sparePartsUsage->load(['permit', 'part', 'vehicle', 'maintenance', 'user']);
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