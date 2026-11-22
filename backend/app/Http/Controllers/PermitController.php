<?php

namespace App\Http\Controllers;

use App\Models\Permit;
use Illuminate\Http\Request;

class PermitController extends Controller
{
    public function index()
    {
        return Permit::with(['vehicle','driver','issuer'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'vehicle_id'=>'required|exists:vehicles,vehicle_id',
            'driver_id'=>'required|exists:drivers,driver_id',
            'issued_by'=>'required|exists:users,user_id',
            'permit_type'=>'required',
            'permit_date'=>'required|date'
        ]);

        return Permit::create($request->all());
    }

    public function show(Permit $permit)
    {
        return $permit->load(['vehicle','driver','issuer']);
    }

    public function update(Request $request, Permit $permit)
    {
        $permit->update($request->all());

        return $permit;
    }

    public function destroy(Permit $permit)
    {
        $permit->delete();

        return response()->json([
            'message'=>'Permit deleted.'
        ]);
    }
}