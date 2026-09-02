<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryChecklist;
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
        'loading_cargo',
        'out_for_delivery',
        'arrived_dropoff',
        'unloading_cargo',
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
            'tracking',
            'checklists',
            'reviews',
        ])->get();
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'request_id' => 'required|exists:delivery_requests,request_id',
            'driver_id' => 'nullable|exists:drivers,driver_id',
            'vehicle_id' => 'nullable|exists:vehicles,vehicle_id',
            'assigned_by' => 'nullable|exists:users,user_id',
            'permit_id' => 'nullable|exists:permits,permit_id',
            'status' => 'nullable|string',
            'trip_cost' => 'nullable|numeric',
            'receipt_photo' => 'nullable|string',
            'payment_verification' => 'nullable|string',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
        ]);

        if (empty($validated['status'])) {
            $validated['status'] = 'pending';
        }

        if (empty($validated['payment_verification'])) {
            $validated['payment_verification'] = 'pending';
        }

        return Delivery::create($validated);
    }

    /*
    |--------------------------------------------------------------------------
    | GET SINGLE DELIVERY
    |--------------------------------------------------------------------------
    */

    public function show(Request $request, Delivery $delivery)
    {
        $driver = Driver::where('user_id', $request->user()->user_id)->first();

        if ($driver && (int) $delivery->driver_id !== (int) $driver->driver_id) {
            return response()->json([
                'message' => 'You are not assigned to this delivery.'
            ], 403);
        }

        return $delivery->load([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
            'permit',
            'tracking',
            'checklists'
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
                'tracking',
                'checklists'
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
            'tracking',
            'checklists',
            'reviews',
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
    | DRIVER APP - GET MY NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    public function myNotifications(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        $driver = Driver::where('user_id', $user->user_id)->first();

        if (!$driver) {
            return response()->json([
                'message' => 'Driver profile not found for this user.'
            ], 404);
        }

        $deliveries = Delivery::with([
            'request.customer',
            'reviews.customer',
        ])
            ->where('driver_id', $driver->driver_id)
            ->orderByDesc('delivery_id')
            ->get();

        $notifications = [];

        foreach ($deliveries as $delivery) {
            $customer = $delivery->request->customer ?? null;
            $customerName = $customer->full_name ?? 'Customer';
            $cargoType = $delivery->request->cargo_type ?? 'Cargo';
            $weight = $delivery->request->weight != null ? $delivery->request->weight . 'kg' : '—';
            $pickup = $delivery->request->pickup_address ?? '—';
            $assignedDate = $delivery->start_time
                ? \Carbon\Carbon::parse($delivery->start_time)->toIso8601String()
                : ($delivery->updated_at
                    ? $delivery->updated_at->toIso8601String()
                    : ($delivery->created_at ? $delivery->created_at->toIso8601String() : now()->toIso8601String()));

            $notifications[] = [
                'id' => 'assignment_' . $delivery->delivery_id,
                'deliveryId' => $delivery->delivery_id,
                'type' => 'New Assignment!',
                'driver' => $customerName,
                'cargo' => $cargoType,
                'weight' => $weight,
                'location' => $pickup,
                'createdAt' => $assignedDate,
                'isRating' => false,
            ];

            if ($delivery->reviews && $delivery->reviews->count() > 0) {
                foreach ($delivery->reviews as $review) {
                    $rating = $review->driver_rating ?? $review->overall_rating ?? 5;
                    $reviewCustomer = $review->customer->full_name ?? $customerName;
                    $comments = $review->comments ?: 'Rated your driver performance';
                    $reviewDate = $review->created_at
                        ? \Carbon\Carbon::parse($review->created_at)->toIso8601String()
                        : $assignedDate;

                    $notifications[] = [
                        'id' => 'review_' . $review->review_id,
                        'deliveryId' => $delivery->delivery_id,
                        'reviewId' => $review->review_id,
                        'type' => 'Customer Rating',
                        'driver' => $reviewCustomer,
                        'cargo' => "Rating: {$rating}/5 Stars",
                        'weight' => $comments,
                        'location' => $pickup,
                        'createdAt' => $reviewDate,
                        'isRating' => true,
                        'rating' => $rating,
                    ];
                }
            }
        }

        usort($notifications, function ($a, $b) {
            return strtotime($b['createdAt']) - strtotime($a['createdAt']);
        });

        return response()->json([
            'data' => $notifications
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DISPATCH DELIVERY
    |--------------------------------------------------------------------------
    */

    public function dispatch(Request $request, Delivery $delivery)
    {
        $validated = $request->validate([
            'driver_id' => 'required|exists:drivers,driver_id',
            'vehicle_id' => 'required|exists:vehicles,vehicle_id',
            'trip_date' => 'nullable|date',
            'fuel_issued' => 'nullable|numeric|min:0',
            'fuel_receipt_no' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:1000',
            'starting_odometer' => 'nullable|numeric|min:0',
            'odometer_reading' => 'nullable|numeric|min:0',
        ]);

        $updated = DB::transaction(function () use (
            $request,
            $delivery,
            $validated
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

            $odometer = $validated['starting_odometer']
                ?? $validated['odometer_reading']
                ?? $request->starting_odometer
                ?? $request->odometer_reading
                ?? null;

            $delivery->update([
                'driver_id' => $request->driver_id,
                'vehicle_id' => $request->vehicle_id,
                'assigned_by' => $request->user()?->user_id,
                'start_time' => now(),
                'status' => 'assigned',
                'trip_date' => $validated['trip_date'] ?? now()->toDateString(),
                'fuel_issued' => $validated['fuel_issued'] ?? null,
                'fuel_receipt_no' => $validated['fuel_receipt_no'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'starting_odometer' => $odometer !== null ? $odometer : $delivery->starting_odometer,
            ]);

            if ($odometer !== null && $delivery->vehicle) {
                $delivery->vehicle()->update([
                    'odometer_reading' => $odometer,
                ]);
            }

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

    public function updateDriverStatus(Request $request, Delivery $delivery)
    {
        $driver = $this->assignedDriver($request, $delivery);

        if ($driver instanceof \Illuminate\Http\JsonResponse) {
            return $driver;
        }

        $validated = $request->validate([
            'status' => 'required|in:accepted,arrived_pickup,loading_cargo,out_for_delivery,arrived_dropoff,unloading_cargo,returning_to_hq,completed',
        ]);

        $targetStatus = $validated['status'];

        if (
            $targetStatus === 'accepted' &&
            !$delivery->checklists()->where('type', 'pre_trip')->exists()
        ) {
            return response()->json([
                'message' => 'Complete the pre-trip checklist before starting navigation.'
            ], 422);
        }

        if ($delivery->status === $targetStatus) {
            return response()->json($this->loadDriverDelivery($delivery));
        }

        $currentIndex = array_search($delivery->status, self::STATUS_ORDER, true);
        $targetIndex = array_search($targetStatus, self::STATUS_ORDER, true);

        if ($currentIndex === false || $targetIndex !== $currentIndex + 1) {
            return response()->json([
                'message' => "Delivery cannot move from {$delivery->status} to {$targetStatus}."
            ], 422);
        }

        $this->setDeliveryStatus($delivery, $targetStatus);

        return response()->json($this->loadDriverDelivery($delivery));
    }

    public function saveChecklist(Request $request, Delivery $delivery)
    {
        $driver = $this->assignedDriver($request, $delivery);

        if ($driver instanceof \Illuminate\Http\JsonResponse) {
            return $driver;
        }

        $validated = $request->validate([
            'type' => 'required|in:pre_trip,post_trip',
            'items' => 'required|array|min:1',
            'items.*' => 'required|boolean',
            'starting_odometer' => 'nullable|numeric|min:0',
            'ending_odometer' => 'nullable|numeric|min:0',
            'starting_fuel' => 'nullable|numeric|min:0',
            'ending_fuel' => 'nullable|numeric|min:0',
        ]);

        if (in_array(false, array_values($validated['items']), true)) {
            return response()->json([
                'message' => 'Complete every checklist item before continuing.'
            ], 422);
        }

        if ($validated['type'] === 'post_trip' && $delivery->status !== 'returning_to_hq') {
            return response()->json([
                'message' => 'Finish the delivery route before submitting the post-trip checklist.'
            ], 422);
        }

        $checklist = DeliveryChecklist::updateOrCreate(
            [
                'delivery_id' => $delivery->delivery_id,
                'type' => $validated['type'],
            ],
            array_merge($validated, ['completed_at' => now()])
        );

        if ($validated['type'] === 'pre_trip') {
            $updateData = [];
            if (isset($validated['starting_odometer'])) {
                $updateData['starting_odometer'] = $validated['starting_odometer'];
            }
            if (isset($validated['starting_fuel'])) {
                $updateData['starting_fuel'] = $validated['starting_fuel'];
            }
            if (!empty($updateData)) {
                $delivery->update($updateData);
            }
            if (isset($validated['starting_odometer']) && $delivery->vehicle) {
                $delivery->vehicle->update(['odometer_reading' => $validated['starting_odometer']]);
            }
        }

        if ($validated['type'] === 'post_trip') {
            $updateData = [];
            if (isset($validated['ending_odometer'])) {
                $updateData['ending_odometer'] = $validated['ending_odometer'];
            }
            if (isset($validated['ending_fuel'])) {
                $updateData['ending_fuel'] = $validated['ending_fuel'];
            }
            if (!empty($updateData)) {
                $delivery->update($updateData);
            }
            if (isset($validated['ending_odometer']) && $delivery->vehicle) {
                $delivery->vehicle->update(['odometer_reading' => $validated['ending_odometer']]);
            }
            $this->setDeliveryStatus($delivery, 'completed');
        }

        return response()->json([
            'checklist' => $checklist->fresh(),
            'delivery' => $this->loadDriverDelivery($delivery),
        ]);
    }

    public function updateLocation(Request $request, Delivery $delivery)
    {
        $driver = $this->assignedDriver($request, $delivery);

        if ($driver instanceof \Illuminate\Http\JsonResponse) {
            return $driver;
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $tracking = DeliveryTracking::create([
            'delivery_id' => $delivery->delivery_id,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'status_update' => $delivery->status,
        ]);

        return response()->json($tracking, 201);
    }

    private function assignedDriver(Request $request, Delivery $delivery)
    {
        $driver = Driver::where('user_id', $request->user()->user_id)->first();

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

        return $driver;
    }

    private function setDeliveryStatus(Delivery $delivery, string $status): void
    {
        DB::transaction(function () use ($delivery, $status) {
            $updates = ['status' => $status];

            if ($status === 'accepted' && !$delivery->start_time) {
                $updates['start_time'] = now();
            }

            if ($status === 'completed') {
                $updates['end_time'] = now();

                $deliveryRequest = $delivery->request;

                if (
                    $deliveryRequest &&
                    $deliveryRequest->payment_term === 'downpayment' &&
                    (float) $delivery->trip_cost < (float) ($deliveryRequest->total_price ?? 0)
                ) {
                    $updates['trip_cost'] = $deliveryRequest->total_price;
                }

                // If ending_odometer is missing but starting_odometer exists, compute and update
                if ($delivery->ending_odometer === null && $delivery->starting_odometer !== null) {
                    $distance = (float) ($deliveryRequest?->distance_km ?? 0);
                    $calculatedEnding = round((float) $delivery->starting_odometer + $distance, 2);
                    $updates['ending_odometer'] = $calculatedEnding;
                    if ($delivery->vehicle) {
                        $delivery->vehicle->update(['odometer_reading' => $calculatedEnding]);
                    }
                } elseif ($delivery->ending_odometer !== null && $delivery->vehicle) {
                    $delivery->vehicle->update(['odometer_reading' => $delivery->ending_odometer]);
                }
            }

            $delivery->update($updates);

            DeliveryTracking::create([
                'delivery_id' => $delivery->delivery_id,
                'status_update' => $status,
            ]);

            if ($status === 'completed') {
                if ($delivery->driver) {
                    $delivery->driver()->update(['availability_status' => 'available']);
                }

                if ($delivery->vehicle) {
                    $delivery->vehicle()->update(['status' => 'available']);
                }
            }
        });
    }

    private function loadDriverDelivery(Delivery $delivery): Delivery
    {
        return $delivery->fresh()->load([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
            'permit',
            'tracking',
            'checklists',
            'reviews',
        ]);
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