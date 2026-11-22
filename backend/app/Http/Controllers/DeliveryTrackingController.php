<?php

namespace App\Http\Controllers;

use App\Models\DeliveryTracking;
use Illuminate\Http\Request;

class DeliveryTrackingController extends Controller
{
    public function index()
    {
        return DeliveryTracking::with('delivery')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'delivery_id' => 'required|exists:deliveries,delivery_id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status_update' => 'nullable|string|max:100',
        ]);

        return DeliveryTracking::create($request->all());
    }

    public function show(DeliveryTracking $deliveryTracking)
    {
        return $deliveryTracking->load('delivery');
    }

    public function update(Request $request, DeliveryTracking $deliveryTracking)
    {
        $deliveryTracking->update($request->all());

        return $deliveryTracking;
    }

    public function destroy(DeliveryTracking $deliveryTracking)
    {
        $deliveryTracking->delete();

        return response()->json([
            'message' => 'Tracking record deleted successfully.'
        ]);
    }
}