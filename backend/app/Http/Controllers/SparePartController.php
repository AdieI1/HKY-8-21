<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use App\Models\SparePartUsage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SparePartController extends Controller
{
    public function index()
    {
        return SparePart::all();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'part_name' => 'required|string|max:100',
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'quantity_in_stock' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|integer|min:0',
            'supplier_name' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model_part_code' => 'nullable|string|max:100',
            'warranty' => 'nullable|string|max:50',
            'supplier_contact' => 'nullable|string|max:50',
            'supplier_address' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'nullable|string',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('spare-parts', 'public');
        }

        $data['status'] = SparePart::determineStatus(
            $data['quantity_in_stock'] ?? 0,
            $data['reorder_level'] ?? 10
        );

        return SparePart::create($data);
    }

    public function show(SparePart $sparePart)
    {
        return $sparePart->load(['maintenances.vehicle', 'usages.vehicle', 'usages.user']);
    }

    public function update(Request $request, SparePart $sparePart)
    {
        $data = $request->validate([
            'part_name' => 'sometimes|required|string|max:100',
            'category' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'quantity_in_stock' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|integer|min:0',
            'supplier_name' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model_part_code' => 'nullable|string|max:100',
            'warranty' => 'nullable|string|max:50',
            'supplier_contact' => 'nullable|string|max:50',
            'supplier_address' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'status' => 'nullable|string',
        ]);

        if ($request->hasFile('image')) {
            $newPath = $request->file('image')->store('spare-parts', 'public');
            $oldPath = $sparePart->image;
            $data['image'] = $newPath;

            $sparePart->update($data);

            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
        } else {
            $sparePart->update($data);
        }

        return $sparePart->fresh();
    }

    /**
     * Stock In (Receive Parts)
     */
    public function stockIn(Request $request, SparePart $sparePart)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'supplier_name' => 'nullable|string|max:100',
            'unit_price' => 'nullable|numeric|min:0',
            'purpose' => 'nullable|string|max:255',
            'used_date' => 'nullable|date',
        ]);

        $qty = (int) $validated['quantity'];
        $unitPrice = $validated['unit_price'] ?? $sparePart->unit_price ?? 0;
        $totalVal = round($qty * $unitPrice, 2);

        $transaction = DB::transaction(function () use ($sparePart, $validated, $qty, $unitPrice, $totalVal, $request) {
            $sparePart->increment('quantity_in_stock', $qty);
            $sparePart->refresh();
            if (!empty($validated['supplier_name'])) {
                $sparePart->supplier_name = $validated['supplier_name'];
            }
            if (!empty($validated['unit_price'])) {
                $sparePart->unit_price = $validated['unit_price'];
            }
            $sparePart->status = SparePart::determineStatus($sparePart->quantity_in_stock, $sparePart->reorder_level);
            $sparePart->save();

            return SparePartUsage::create([
                'part_id' => $sparePart->part_id,
                'transaction_type' => 'in',
                'supplier_name' => $validated['supplier_name'] ?? $sparePart->supplier_name,
                'user_id' => $request->user()?->user_id,
                'quantity_used' => $qty,
                'unit_price' => $unitPrice,
                'total_value' => $totalVal,
                'purpose' => $validated['purpose'] ?: 'Received new stock / Parts In',
                'used_date' => $validated['used_date'] ?? now()->toDateString(),
            ]);
        });

        return response()->json([
            'message' => 'Parts received successfully.',
            'part' => $sparePart->fresh(),
            'transaction' => $transaction->load(['part', 'user']),
        ]);
    }

    /**
     * Stock Out (Issue Parts)
     */
    public function stockOut(Request $request, SparePart $sparePart)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'purpose' => 'nullable|string|max:255',
            'used_date' => 'nullable|date',
        ]);

        $qty = (int) $validated['quantity'];

        if ($qty > $sparePart->quantity_in_stock) {
            return response()->json([
                'message' => 'Insufficient stock available! Current stock: ' . $sparePart->quantity_in_stock . ' ' . ($sparePart->unit ?: 'pcs') . ', requested: ' . $qty
            ], 422);
        }

        $transaction = DB::transaction(function () use ($sparePart, $validated, $qty, $request) {
            $sparePart->decrement('quantity_in_stock', $qty);
            $sparePart->refresh();
            $sparePart->status = SparePart::determineStatus($sparePart->quantity_in_stock, $sparePart->reorder_level);
            $sparePart->save();

            return SparePartUsage::create([
                'part_id' => $sparePart->part_id,
                'transaction_type' => 'out',
                'vehicle_id' => $validated['vehicle_id'] ?? null,
                'user_id' => $request->user()?->user_id,
                'quantity_used' => $qty,
                'unit_price' => $sparePart->unit_price,
                'total_value' => round($qty * ($sparePart->unit_price ?? 0), 2),
                'purpose' => $validated['purpose'] ?: 'Issued parts / Parts Out',
                'used_date' => $validated['used_date'] ?? now()->toDateString(),
            ]);
        });


        return response()->json([
            'message' => 'Parts issued successfully.',
            'part' => $sparePart->fresh(),
            'transaction' => $transaction->load(['part', 'vehicle', 'user']),
        ]);
    }

    public function destroy(SparePart $sparePart)
    {
        if ($sparePart->image) {
            Storage::disk('public')->delete($sparePart->image);
        }

        $sparePart->delete();

        return response()->json([
            'message' => 'Spare part deleted successfully.'
        ]);
    }
}