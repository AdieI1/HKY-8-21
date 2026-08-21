<?php

namespace App\Http\Controllers;

use App\Models\SparePart;
use Illuminate\Http\Request;

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
            'image' => 'nullable|image|max:2048',
            'status' => 'required|in:available,low_stock,out_of_stock',
        ]);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('spare-parts', 'public');
        }

        return SparePart::create($data);
    }

    public function show(SparePart $sparePart)
    {
        return $sparePart;
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
            'image' => 'nullable|image|max:2048',
            'status' => 'sometimes|required|in:available,low_stock,out_of_stock',
        ]);

        if ($request->hasFile('image')) {
            // Swap the file first, then clean up the old one so a failed
            // upload never leaves the part with no image at all.
            $newPath = $request->file('image')->store('spare-parts', 'public');
            $oldPath = $sparePart->image;
            $data['image'] = $newPath;

            $sparePart->update($data);

            if ($oldPath) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
        } else {
            $sparePart->update($data);
        }

        return $sparePart->fresh();
    }

    public function destroy(SparePart $sparePart)
    {
        if ($sparePart->image) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($sparePart->image);
        }

        $sparePart->delete();

        return response()->json([
            'message' => 'Spare part deleted successfully.'
        ]);
    }
}