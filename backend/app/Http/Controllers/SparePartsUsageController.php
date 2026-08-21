<?php

namespace App\Http\Controllers;

use App\Models\SparePartsUsage;
use Illuminate\Http\Request;

class SparePartsUsageController extends Controller
{
    public function index()
    {
        return SparePartsUsage::with(['permit','part'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'permit_id'=>'required|exists:permits,permit_id',
            'part_id'=>'required|exists:spare_parts,part_id',
            'quantity_used'=>'required|integer|min:1',
            'used_date'=>'required|date'
        ]);

        return SparePartsUsage::create($request->all());
    }

    public function show(SparePartUsage $sparePartUsage)
    {
        return $sparePartUsage->load(['permit','part']);
    }

    public function update(Request $request, SparePartsUsage $sparePartUsage)
    {
        $sparePartUsage->update($request->all());

        return $sparePartUsage;
    }

    public function destroy(SparePartsUsage $sparePartUsage)
    {
        $sparePartUsage->delete();

        return response()->json([
            'message'=>'Spare part usage deleted.'
        ]);
    }
}