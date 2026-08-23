<?php

namespace App\Http\Controllers;

use App\Models\VehicleMaintenance;
use Illuminate\Http\Request;

class VehicleMaintenanceController extends Controller
{
    public function index()
    {
        return VehicleMaintenance::with(['vehicle','part','maintainer'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'vehicle_id'=>'required|exists:vehicles,vehicle_id',
            'part_id'=>'nullable|exists:spare_parts,part_id',
            'maintained_by'=>'nullable|exists:users,user_id',
            'maintenance_type'=>'required',
            'maintenance_date'=>'required|date'
        ]);

        return VehicleMaintenance::create($request->all());
    }

    public function show(VehicleMaintenance $vehicleMaintenance)
    {
        return $vehicleMaintenance->load(['vehicle','part','maintainer']);
    }

    public function update(Request $request, VehicleMaintenance $vehicleMaintenance)
    {
        $vehicleMaintenance->update($request->all());

        return $vehicleMaintenance;
    }

    public function destroy(VehicleMaintenance $vehicleMaintenance)
    {
        $vehicleMaintenance->delete();

        return response()->json([
            'message'=>'Maintenance record deleted.'
        ]);
    }
}