<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DeliveryRequestController extends Controller
{
    public function index()
    {
        return DeliveryRequest::with('customer')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:users,user_id',
            'cargo_type' => 'nullable|string|max:100',
            'fragility' => 'nullable|in:low,medium,high',
            'weight' => 'nullable|numeric',
            'pickup_address' => 'nullable|string',
            'dropoff_address' => 'nullable|string',
            'distance_km' => 'nullable|numeric',
            'total_price' => 'nullable|numeric',
            'payment_term' => 'nullable|in:downpayment,full',
            'payment_method' => 'nullable|in:bank_transfer,cash',
            'status' => 'required|in:draft,pending,approved,rejected'
        ]);

        return DeliveryRequest::create($request->all());
    }

    /**
     * Creates a new customer account together with their delivery request
     * in one submission — used by the "Create Delivery Request & Customer
     * Setup" form, which walks an admin through both at once for a
     * walk-in/phone customer who doesn't have an account yet.
     */
    public function storeWithCustomer(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'phone' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:50|unique:users,username',
            'password' => 'required|min:6',
            'cargo_type' => 'nullable|string|max:100',
            'fragility' => 'nullable|in:low,medium,high',
            'weight' => 'nullable|numeric',
            'pickup_address' => 'nullable|string',
            'pickup_lat' => 'nullable|numeric',
            'pickup_lng' => 'nullable|numeric',
            'dropoff_address' => 'nullable|string',
            'dropoff_lat' => 'nullable|numeric',
            'dropoff_lng' => 'nullable|numeric',
            'distance_km' => 'nullable|numeric',
            'total_price' => 'nullable|numeric',
            'payment_term' => 'nullable|in:downpayment,full',
            'payment_method' => 'nullable|in:bank_transfer,cash',
            'is_draft' => 'nullable|boolean',
        ]);

        $customerRole = Role::where('role_name', 'Customer')->first();

        $deliveryRequest = DB::transaction(function () use ($request, $customerRole) {
            $user = User::create([
                'role_id' => $customerRole?->role_id,
                'full_name' => trim($request->first_name . ' ' . $request->last_name),
                'email' => $request->email,
                'username' => $request->username,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'status' => 'active',
            ]);

            return DeliveryRequest::create([
                'customer_id' => $user->user_id,
                'cargo_type' => $request->cargo_type,
                'fragility' => $request->fragility,
                'weight' => $request->weight,
                'pickup_address' => $request->pickup_address,
                'pickup_lat' => $request->pickup_lat,
                'pickup_lng' => $request->pickup_lng,
                'dropoff_address' => $request->dropoff_address,
                'dropoff_lat' => $request->dropoff_lat,
                'dropoff_lng' => $request->dropoff_lng,
                'distance_km' => $request->distance_km,
                'total_price' => $request->total_price,
                'payment_term' => $request->payment_term,
                'payment_method' => $request->payment_method,
                'status' => $request->boolean('is_draft') ? 'draft' : 'pending',
            ]);
        });

        return $deliveryRequest->load('customer');
    }

    public function show(DeliveryRequest $deliveryRequest)
    {
        return $deliveryRequest->load('customer');
    }

    public function update(Request $request, DeliveryRequest $deliveryRequest)
    {
        $deliveryRequest->update($request->all());

        return $deliveryRequest;
    }

    /**
     * Approves the request and creates the corresponding (unassigned)
     * Delivery record, so it's ready to be picked up on the Dispatch
     * Management page. Revenue counts immediately based on payment term:
     * full payment counts the whole amount now; a downpayment counts half
     * now, with the remaining half added once the delivery is marked
     * completed (see DeliveryController::advanceStatus).
     */
    public function approve(DeliveryRequest $deliveryRequest)
    {
        $delivery = DB::transaction(function () use ($deliveryRequest) {
            $deliveryRequest->update(['status' => 'approved']);

            $totalPrice = $deliveryRequest->total_price ?? 0;
            $tripCost = $deliveryRequest->payment_term === 'downpayment'
                ? round($totalPrice / 2, 2)
                : $totalPrice;

            return Delivery::create([
                'request_id' => $deliveryRequest->request_id,
                'status' => 'assigned',
                'trip_cost' => $tripCost,
                'payment_verification' => 'approved',
            ]);
        });

        return response()->json([
            'request' => $deliveryRequest->fresh()->load('customer'),
            'delivery' => $delivery,
        ]);
    }

    public function destroy(DeliveryRequest $deliveryRequest)
    {
        $deliveryRequest->delete();

        return response()->json([
            'message' => 'Delivery Request deleted successfully.'
        ]);
    }
}