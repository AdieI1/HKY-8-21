<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Driver;
use App\Models\DeliveryTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryController extends Controller
{
    private const STATUS_ORDER = [
        'assigned',
        'accepted',
        'arrived_pickup',
        'out_for_delivery',
        'arrived_dropoff',
        'returning_to_hq',
        'completed',
    ];

    /*
    |--------------------------------------------------------------------------
    | GET ALL DELIVERIES
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        return Delivery::with([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
            'permit',
            'tracking'
        ])->get();
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $request->validate([
            'request_id' => 'required|exists:delivery_requests,request_id',
            'driver_id' => 'nullable|exists:drivers,driver_id',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'assigned_by' => 'nullable|exists:users,user_id',
            'permit_id' => 'nullable|exists:permits,permit_id',
            'status' => 'required',
            'trip_cost' => 'nullable|numeric',
            'receipt_photo' => 'nullable|string',
            'payment_verification' => 'required',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
        ]);

        return Delivery::create($request->all());
    }

    /*
    |--------------------------------------------------------------------------
    | GET SINGLE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function show(Delivery $delivery)
    {
        return $delivery->load([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
            'permit',
            'tracking'
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, Delivery $delivery)
    {
        $delivery->update($request->all());

        return $delivery
            ->fresh()
            ->load([
                'request.customer',
                'driver.user',
                'vehicle',
                'assignedBy',
                'permit',
                'tracking'
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DRIVER APP - GET MY DELIVERIES
    |--------------------------------------------------------------------------
    |
    | This is the method that was missing.
    |
    | It finds the logged-in user's Driver record using:
    |
    | users.user_id -> drivers.user_id
    |
    | Then returns only deliveries assigned to that driver.
    |
    */

    public function myDeliveries(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | Find driver record belonging to logged-in user
        |--------------------------------------------------------------------------
        */

        $driver = Driver::where('user_id', $user->user_id)->first();

        if (!$driver) {
            return response()->json([
                'message' => 'Driver profile not found for this user.'
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | Get deliveries assigned to this driver
        |--------------------------------------------------------------------------
        */

        $deliveries = Delivery::with([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
            'permit',
            'tracking'
        ])
            ->where('driver_id', $driver->driver_id)
            ->orderByDesc('delivery_id')
            ->get();

        return response()->json([
            'data' => $deliveries
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DISPATCH DELIVERY
    |--------------------------------------------------------------------------
    */

    public function dispatch(Request $request, Delivery $delivery)
    {
        $request->validate([
            'driver_id' => 'required|exists:drivers,driver_id',
            'vehicle_id' => 'required|exists:vehicles,vehicle_id',
        ]);

        $updated = DB::transaction(function () use (
            $request,
            $delivery
        ) {
            /*
            |--------------------------------------------------------------------------
            | If this delivery was previously assigned to another driver,
            | make that driver available again.
            |--------------------------------------------------------------------------
            */

            if (
                $delivery->driver_id &&
                $delivery->driver_id != $request->driver_id
            ) {
                $oldDriver = Driver::find($delivery->driver_id);

                if ($oldDriver) {
                    $oldDriver->update([
                        'availability_status' => 'available'
                    ]);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | If this delivery previously had another vehicle,
            | make that vehicle available again.
            |--------------------------------------------------------------------------
            */

            if (
                $delivery->vehicle_id &&
                $delivery->vehicle_id != $request->vehicle_id
            ) {
                $oldVehicle = $delivery->vehicle;

                if ($oldVehicle) {
                    $oldVehicle->update([
                        'status' => 'available'
                    ]);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | Assign delivery
            |--------------------------------------------------------------------------
            */

            $delivery->update([
                'driver_id' => $request->driver_id,
                'vehicle_id' => $request->vehicle_id,
                'assigned_by' => $request->user()?->user_id,
                'start_time' => now(),
                'status' => 'assigned',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Mark driver busy
            |--------------------------------------------------------------------------
            */

            $delivery->driver()->update([
                'availability_status' => 'busy'
            ]);

            /*
            |--------------------------------------------------------------------------
            | Mark vehicle in use
            |--------------------------------------------------------------------------
            */

            $delivery->vehicle()->update([
                'status' => 'in_use'
            ]);

            /*
            |--------------------------------------------------------------------------
            | Record tracking event
            |--------------------------------------------------------------------------
            */

            DeliveryTracking::create([
                'delivery_id' => $delivery->delivery_id,
                'status_update' => 'assigned',
            ]);

            return $delivery;
        });

        return response()->json(
            $updated
                ->fresh()
                ->load([
                    'request.customer',
                    'driver.user',
                    'vehicle',
                    'tracking'
                ])
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADVANCE DELIVERY STATUS
    |--------------------------------------------------------------------------
    */

    public function advanceStatus(Request $request, Delivery $delivery)
    {
        /*
        |--------------------------------------------------------------------------
        | Optional security check:
        | If a driver is calling this endpoint, make sure the delivery
        | actually belongs to that driver.
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        if (
            $user &&
            isset($user->role_id) &&
            (int) $user->role_id === 3
        ) {
            $driver = Driver::where(
                'user_id',
                $user->user_id
            )->first();

            if (!$driver) {
                return response()->json([
                    'message' => 'Driver profile not found.'
                ], 404);
            }

            if ((int) $delivery->driver_id !== (int) $driver->driver_id) {
                return response()->json([
                    'message' => 'You are not assigned to this delivery.'
                ], 403);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Find current status
        |--------------------------------------------------------------------------
        */

        $currentIndex = array_search(
            $delivery->status,
            self::STATUS_ORDER
        );

        if ($currentIndex === false) {
            return response()->json([
                'message' => 'Invalid delivery status.'
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Already completed
        |--------------------------------------------------------------------------
        */

        if (
            $currentIndex >= count(self::STATUS_ORDER) - 1
        ) {
            return response()->json([
                'message' =>
                    'Delivery is already at its final status.'
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Determine next status
        |--------------------------------------------------------------------------
        */

        $nextStatus = self::STATUS_ORDER[$currentIndex + 1];

        /*
        |--------------------------------------------------------------------------
        | Update everything in one transaction
        |--------------------------------------------------------------------------
        */

        DB::transaction(function () use (
            $delivery,
            $nextStatus
        ) {
            /*
            |--------------------------------------------------------------------------
            | Update delivery
            |--------------------------------------------------------------------------
            */

            $delivery->update([
                'status' => $nextStatus
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create tracking record
            |--------------------------------------------------------------------------
            */

            DeliveryTracking::create([
                'delivery_id' => $delivery->delivery_id,
                'status_update' => $nextStatus,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Completed delivery
            |--------------------------------------------------------------------------
            */

            if ($nextStatus === 'completed') {

                $delivery->update([
                    'end_time' => now()
                ]);

                $deliveryRequest = $delivery->request;

                /*
                |--------------------------------------------------------------------------
                | Downpayment handling
                |--------------------------------------------------------------------------
                */

                if (
                    $deliveryRequest &&
                    $deliveryRequest->payment_term === 'downpayment'
                ) {
                    $fullPrice =
                        $deliveryRequest->total_price ?? 0;

                    if (
                        (float) $delivery->trip_cost <
                        (float) $fullPrice
                    ) {
                        $delivery->update([
                            'trip_cost' => $fullPrice
                        ]);
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | Driver becomes available
                |--------------------------------------------------------------------------
                */

                if ($delivery->driver) {
                    $delivery->driver()->update([
                        'availability_status' => 'available'
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Vehicle becomes available
                |--------------------------------------------------------------------------
                */

                if ($delivery->vehicle) {
                    $delivery->vehicle()->update([
                        'status' => 'available'
                    ]);
                }
            }
        });

        /*
        |--------------------------------------------------------------------------
        | Return updated delivery
        |--------------------------------------------------------------------------
        */

        return response()->json(
            $delivery
                ->fresh()
                ->load([
                    'request.customer',
                    'driver.user',
                    'vehicle',
                    'tracking'
                ])
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function destroy(Delivery $delivery)
    {
        $delivery->delete();

        return response()->json([
            'message' => 'Delivery deleted successfully.'
        ]);
    }
}