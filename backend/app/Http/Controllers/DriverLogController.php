<?php

namespace App\Http\Controllers;

use App\Models\DriverLog;
use Illuminate\Http\Request;

class DriverLogController extends Controller
{
    public function index()
    {
        return DriverLog::with(['driver','vehicle','delivery'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'driver_id'=>'required|exists:drivers,driver_id',
            'vehicle_id'=>'required|exists:vehicles,vehicle_id',
            'delivery_id'=>'nullable|exists:deliveries,delivery_id',
            'log_date'=>'required|date'
        ]);

        return DriverLog::create($request->all());
    }

    public function show(DriverLog $driverLog)
    {
        return $driverLog->load(['driver','vehicle','delivery']);
    }

    public function update(Request $request, DriverLog $driverLog)
    {
        $driverLog->update($request->all());

        return $driverLog;
    }

    public function destroy(DriverLog $driverLog)
    {
        $driverLog->delete();

        return response()->json([
            'message'=>'Driver log deleted.'
        ]);
    }
}