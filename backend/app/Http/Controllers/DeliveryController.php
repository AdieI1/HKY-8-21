<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryChecklist;
use App\Models\Driver;
use App\Models\DeliveryTracking;
use App\Models\AppNotification;
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
            'tracking' => function ($q) {
                $q->orderBy('tracking_id', 'asc');
            },
            'checklists',
            'reviews',
            'incidents',
            'strandedDriver.user',
            'strandedVehicle',
            'reliefIncident',
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

        if (empty($validated['assigned_by']) && $request->user()) {
            $validated['assigned_by'] = $request->user()->user_id;
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
            'checklists',
            'incidents',
            'strandedDriver.user',
            'strandedVehicle',
            'reliefIncident'
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
                'checklists',
                'incidents',
                'strandedDriver.user',
                'strandedVehicle',
                'reliefIncident'
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
            'strandedDriver.user',
            'strandedVehicle',
            'reliefIncident',
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
            'estimated_duration_days' => 'nullable|integer|min:1|max:30',
            'estimated_delivery_date' => 'nullable|date',
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
            | Check for active breakdown incident / relief assignment
            |--------------------------------------------------------------------------
            */

            $activeIncident = \App\Models\IncidentReport::where('delivery_id', $delivery->delivery_id)
                ->whereNotIn('status', ['resolved', 'relief_dispatched', 'closed'])
                ->latest('reported_at')
                ->first();

            $isReliefAssignment = false;
            $cargoLoaded = false;
            $strandedDriverId = $delivery->stranded_driver_id;
            $strandedVehicleId = $delivery->stranded_vehicle_id;
            $reliefIncidentId = $delivery->relief_incident_id;
            $reliefOriginAddress = null;
            $reliefOriginLat = null;
            $reliefOriginLng = null;

            if ($activeIncident || $delivery->is_relief || ($delivery->vehicle && $delivery->vehicle->status === 'broken')) {
                $isReliefAssignment = true;
                $strandedDriverId = $delivery->driver_id ?: $delivery->stranded_driver_id;
                $strandedVehicleId = $delivery->vehicle_id ?: $delivery->stranded_vehicle_id;

                // Scenario 2: Cargo was already loaded onboard before the breakdown occurred
                // Scenario 1: Cargo was NOT yet loaded (driver was heading to or just arrived at pickup)
                $wasCargoLoaded = in_array($delivery->status, ['loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo'])
                    || ($delivery->is_relief && $delivery->cargo_loaded);

                $cargoLoaded = $wasCargoLoaded;

                if ($activeIncident) {
                    $reliefIncidentId = $activeIncident->incident_id;

                    if ($wasCargoLoaded) {
                        // Cargo is inside the disabled truck -> Relief truck must navigate to breakdown site for transshipment
                        $reliefOriginAddress = $activeIncident->location_address;
                        $reliefOriginLat = $activeIncident->latitude;
                        $reliefOriginLng = $activeIncident->longitude;
                    } else {
                        // Cargo is not loaded -> Relief truck heads directly to Customer Pickup Address
                        $reliefOriginAddress = null;
                        $reliefOriginLat = null;
                        $reliefOriginLng = null;
                    }

                    $activeIncident->update([
                        'status' => 'resolved',
                        'resolution_action' => 'relief_dispatched',
                        'resolution_notes' => $wasCargoLoaded
                            ? 'Relief vehicle/driver assigned and dispatched to breakdown location for transshipment.'
                            : 'Replacement vehicle/driver assigned and dispatched directly to customer pickup location.',
                        'resolved_at' => now(),
                        'resolved_by' => $dispatcherUserId,
                    ]);
                } else if ($delivery->is_relief && $delivery->cargo_loaded) {
                    $reliefIncidentId = $delivery->relief_incident_id;
                    $reliefOriginAddress = $delivery->relief_origin_address;
                    $reliefOriginLat = $delivery->relief_origin_lat;
                    $reliefOriginLng = $delivery->relief_origin_lng;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | If this delivery previously had another vehicle,
            | make that vehicle available again unless broken.
            |--------------------------------------------------------------------------
            */

            if (
                $delivery->vehicle_id &&
                $delivery->vehicle_id != $request->vehicle_id
            ) {
                $oldVehicle = $delivery->vehicle;

                if ($oldVehicle) {
                    if ($isReliefAssignment || $oldVehicle->status === 'broken') {
                        $oldVehicle->update(['status' => 'broken']);
                    } elseif (!in_array($oldVehicle->status, ['maintenance', 'decommissioned'])) {
                        $oldVehicle->update(['status' => 'available']);
                    }
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

            $durationDays = isset($validated['estimated_duration_days']) ? (int) $validated['estimated_duration_days'] : ($delivery->estimated_duration_days ?: 2);
            $estDeliveryDate = $validated['estimated_delivery_date'] ?? null;
            if (!$estDeliveryDate) {
                $estDeliveryDate = now()->addDays($durationDays);
            }

            $dispatcherUserId = $request->user()?->user_id 
                ?? $request->input('assigned_by') 
                ?? \App\Models\User::whereHas('role', fn($q) => $q->whereIn('role_name', ['Staff', 'Admin', 'Dispatcher', 'staff', 'admin']))->value('user_id')
                ?? 2;

            // Relief reassignment is a fresh start for the new driver ('assigned')
            if ($isReliefAssignment) {
                $newStatus = 'assigned';
            } else {
                $wasOngoing = in_array($delivery->status, ['accepted', 'in_transit', 'out_for_delivery', 'loading_cargo', 'arrived_pickup']);
                $newStatus = $wasOngoing ? 'out_for_delivery' : 'assigned';
            }

            $delivery->update([
                'driver_id' => $request->driver_id,
                'vehicle_id' => $request->vehicle_id,
                'assigned_by' => $dispatcherUserId,
                'start_time' => $delivery->start_time ?: now(),
                'status' => $newStatus,
                'trip_date' => $validated['trip_date'] ?? ($delivery->trip_date ?: now()->toDateString()),
                'estimated_duration_days' => $durationDays,
                'estimated_delivery_date' => $estDeliveryDate,
                'fuel_issued' => $validated['fuel_issued'] ?? null,
                'fuel_receipt_no' => $validated['fuel_receipt_no'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'starting_odometer' => $odometer !== null ? $odometer : $delivery->starting_odometer,
                'is_relief' => $isReliefAssignment,
                'cargo_loaded' => $cargoLoaded,
                'relief_origin_address' => $reliefOriginAddress,
                'relief_origin_lat' => $reliefOriginLat,
                'relief_origin_lng' => $reliefOriginLng,
                'stranded_driver_id' => $strandedDriverId,
                'stranded_vehicle_id' => $strandedVehicleId,
                'relief_incident_id' => $reliefIncidentId,
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

            $delCode = 'DEL' . str_pad($delivery->delivery_id, 4, '0', STR_PAD_LEFT);
            $driverName = $delivery->driver?->user?->full_name ?: 'Driver';

            if ($isReliefAssignment) {
                $customerMsg = $cargoLoaded
                    ? "A relief truck ({$driverName}) has been dispatched to secure cargo and complete delivery #{$delCode}."
                    : "A replacement truck ({$driverName}) has been assigned and is heading to the pickup location for delivery #{$delCode}.";
                AppNotification::notify('dispatch', 'Relief Truck Dispatched', $customerMsg, '/delivery');

                if ($delivery->request?->customer_id) {
                    AppNotification::create([
                        'user_id' => $delivery->request->customer_id,
                        'title' => 'Relief Truck Dispatched (#' . $delCode . ')',
                        'message' => $customerMsg,
                        'type' => 'delivery_relief',
                        'data' => [
                            'delivery_id' => $delivery->delivery_id,
                            'is_relief' => true,
                            'cargo_loaded' => $cargoLoaded,
                        ],
                    ]);
                }
            } else {
                AppNotification::notify('dispatch', 'Delivery Assigned', "Delivery #{$delCode} assigned to {$driverName}.", '/delivery');
            }

            try {
                \App\Events\DeliveryUpdated::dispatch($delivery);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Reverb broadcast error: " . $e->getMessage());
            }

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

        $canCompleteDirectly = ($targetStatus === 'completed' && in_array($delivery->status, ['unloading_cargo', 'returning_to_hq'], true));

        if (!$canCompleteDirectly && ($currentIndex === false || $targetIndex !== $currentIndex + 1)) {
            return response()->json([
                'message' => "Delivery cannot move from {$delivery->status} to {$targetStatus}."
            ], 422);
        }

        $this->setDeliveryStatus($delivery, $targetStatus);

        return response()->json($this->loadDriverDelivery($delivery));
    }

    public function saveChecklist(Request $request, Delivery $delivery)
    {
        $user = $request->user();
        $isStaffOrAdmin = $user && (
            in_array((int) $user->role_id, [1, 2, 5]) ||
            strtolower($user->role?->role_name ?? '') === 'staff' ||
            strtolower($user->role?->role_name ?? '') === 'admin'
        );

        if ($user && !$isStaffOrAdmin) {
            $driver = $this->assignedDriver($request, $delivery);

            if ($driver instanceof \Illuminate\Http\JsonResponse) {
                return $driver;
            }
        }

        $validated = $request->validate([
            'type' => 'required|in:pre_trip,post_trip',
            'items' => 'required|array|min:1',
            'items.*' => 'nullable',
            'starting_odometer' => 'nullable|numeric|min:0',
            'ending_odometer' => 'nullable|numeric|min:0',
            'starting_fuel' => 'nullable|numeric|min:0',
            'ending_fuel' => 'nullable|numeric|min:0',
        ]);

        if (in_array(null, array_values($validated['items']), true)) {
            return response()->json([
                'message' => 'Complete every checklist item before continuing.'
            ], 422);
        }

        if ($validated['type'] === 'post_trip' && !in_array($delivery->status, ['returning_to_hq', 'arrived', 'delivered', 'in_transit', 'completed'])) {
            return response()->json([
                'message' => 'Finish the delivery route before submitting the post-trip checklist.'
            ], 422);
        }

        $inspectorId = $user?->user_id;
        $inspectorName = $user?->full_name ?? $user?->name ?? $request->input('inspector_name', 'Authorized Inspector');

        $checklistData = array_merge($validated, [
            'inspected_by' => $inspectorId,
            'inspector_name' => $inspectorName,
            'completed_at' => now(),
        ]);

        $checklist = DeliveryChecklist::updateOrCreate(
            [
                'delivery_id' => $delivery->delivery_id,
                'type' => $validated['type'],
            ],
            $checklistData
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
            'speed' => 'nullable|numeric|min:0|max:200',
        ]);

        $speed = null;
        if ($request->filled('speed') && is_numeric($request->input('speed'))) {
            $speed = round((float) $request->input('speed'), 1);
        } else {
            // Automatically derive speed from previous GPS ping if available
            $lastPing = DeliveryTracking::where('delivery_id', $delivery->delivery_id)
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->orderBy('tracking_id', 'desc')
                ->first();

            if ($lastPing && $lastPing->latitude && $lastPing->longitude && $lastPing->timestamp) {
                $lat1 = (float) $lastPing->latitude;
                $lon1 = (float) $lastPing->longitude;
                $lat2 = (float) $validated['latitude'];
                $lon2 = (float) $validated['longitude'];

                $latDelta = deg2rad($lat2 - $lat1);
                $lonDelta = deg2rad($lon2 - $lon1);
                $a = sin($latDelta / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * (sin($lonDelta / 2) ** 2);
                $distKm = 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));

                $deltaSec = abs(now()->diffInSeconds($lastPing->timestamp));
                if ($distKm < 0.003) {
                    $speed = 0.0;
                } elseif ($deltaSec >= 1 && $deltaSec <= 1800) {
                    $computed = ($distKm / ($deltaSec / 3600));
                    $speed = round(min(140, $computed), 1);
                }
            }
        }

        $tracking = DeliveryTracking::create([
            'delivery_id' => $delivery->delivery_id,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'speed' => $speed,
            'status_update' => $delivery->status,
            'timestamp' => now(),
        ]);

        try {
            \App\Events\DeliveryLocationUpdated::dispatch($delivery, $tracking);
        } catch (\Throwable $e) {
            \Log::warning('DeliveryLocationUpdated broadcast failed: ' . $e->getMessage());
        }

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

            $delCode = 'DEL' . str_pad($delivery->delivery_id, 4, '0', STR_PAD_LEFT);
            $statusStr = ucwords(str_replace('_', ' ', $status));
            $driverName = $delivery->driver?->user?->full_name ?: 'Driver';
            AppNotification::notify('delivery', "Delivery {$statusStr}", "Delivery #{$delCode} ({$driverName}) is now {$statusStr}.", '/delivery');

            try {
                \App\Events\DeliveryUpdated::dispatch($delivery);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Reverb broadcast error: " . $e->getMessage());
            }

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
            'strandedDriver.user',
            'strandedVehicle',
            'reliefIncident',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PROPOSE RESCHEDULE FOR UNASSIGNED DELIVERY
    |--------------------------------------------------------------------------
    */
    public function proposeReschedule(Request $request, Delivery $delivery)
    {
        $validated = $request->validate([
            'proposed_date' => 'required|date',
            'proposed_time_slot' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:500',
        ]);

        $deliveryRequest = $delivery->request;
        if (!$deliveryRequest) {
            return response()->json(['message' => 'Associated delivery request not found.'], 404);
        }

        $deliveryRequest->update([
            'reschedule_proposed_date' => $validated['proposed_date'],
            'reschedule_proposed_time_slot' => $validated['proposed_time_slot'] ?? '09:00 AM',
            'reschedule_status' => 'proposed',
        ]);

        if ($deliveryRequest->customer_id) {
            AppNotification::create([
                'user_id' => $deliveryRequest->customer_id,
                'title' => 'Reschedule Proposed for Delivery DLV' . str_pad($delivery->delivery_id, 4, '0', STR_PAD_LEFT),
                'message' => 'HJY Trucking proposed dispatch on ' . date('M d, Y', strtotime($validated['proposed_date'])) . ' at ' . ($validated['proposed_time_slot'] ?? '09:00 AM') . ' based on driver availability. Tap to confirm.',
                'type' => 'delivery_reschedule',
                'data' => [
                    'delivery_id' => $delivery->delivery_id,
                    'request_id' => $deliveryRequest->request_id,
                    'proposed_date' => $validated['proposed_date'],
                    'proposed_time_slot' => $validated['proposed_time_slot'] ?? '09:00 AM',
                ],
                'is_read' => false,
            ]);
        }

        return response()->json([
            'message' => 'Reschedule proposal sent to customer successfully.',
            'delivery' => $delivery->fresh()->load(['request.customer', 'driver.user', 'vehicle']),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ACCEPT PROPOSED RESCHEDULE (CUSTOMER OR DISPATCHER)
    |--------------------------------------------------------------------------
    */
    public function acceptReschedule(Request $request, Delivery $delivery)
    {
        $deliveryRequest = $delivery->request;
        if (!$deliveryRequest) {
            return response()->json(['message' => 'Associated delivery request not found.'], 404);
        }

        $selectedDate = $request->input('selected_date') ?: $deliveryRequest->reschedule_proposed_date;
        $selectedSlot = $request->input('selected_time_slot') ?: $deliveryRequest->reschedule_proposed_time_slot ?: '09:00 AM';

        $deliveryRequest->update([
            'is_scheduled' => true,
            'scheduled_date' => $selectedDate,
            'scheduled_time_slot' => $selectedSlot,
            'reschedule_status' => 'accepted',
        ]);

        return response()->json([
            'message' => 'Delivery schedule confirmed successfully.',
            'delivery' => $delivery->fresh()->load(['request.customer', 'driver.user', 'vehicle']),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | NOTIFY CUSTOMER OF DELIVERY DELAY
    |--------------------------------------------------------------------------
    */
    public function notifyDelay(Request $request, Delivery $delivery)
    {
        $validated = $request->validate([
            'revised_eta' => 'nullable|string|max:100',
            'delay_reason' => 'nullable|string|max:255',
            'custom_message' => 'nullable|string|max:1000',
        ]);

        $deliveryRequest = $delivery->request;
        $delCode = 'DLV' . str_pad($delivery->delivery_id, 4, '0', STR_PAD_LEFT);

        $reason = $validated['delay_reason'] ?? $delivery->delay_reason ?? 'Transit or weather delay';
        $revisedEta = $validated['revised_eta'] ?? null;

        // Build notification message
        if (!empty($validated['custom_message'])) {
            $msg = $validated['custom_message'];
        } else {
            $msg = "Shipment #{$delCode} is experiencing a delay due to {$reason}.";
            if ($revisedEta) {
                $msg .= " Revised estimated arrival: {$revisedEta}.";
            }
            $msg .= " We appreciate your patience as our fleet navigates safely.";
        }

        $updateData = [
            'delay_notified_at' => now(),
            'delay_reason' => $reason,
        ];

        // If a parsed date is supplied in revised_eta
        if ($revisedEta && strtotime($revisedEta)) {
            $updateData['estimated_delivery_date'] = date('Y-m-d H:i:s', strtotime($revisedEta));
        }

        $delivery->update($updateData);

        if ($deliveryRequest && $deliveryRequest->customer_id) {
            AppNotification::notify(
                'delivery_delay',
                "Delivery Delay Notice (#{$delCode})",
                $msg,
                '/customer/tracking',
                $deliveryRequest->customer_id
            );
        }

        // Also notify dispatch team
        AppNotification::notify(
            'delivery_delay',
            "Delay Notice Sent (#{$delCode})",
            "Customer notified of delay for #{$delCode}. Reason: {$reason}.",
            '/delivery'
        );

        DeliveryTracking::create([
            'delivery_id' => $delivery->delivery_id,
            'status_update' => 'delay_notified',
        ]);

        try {
            \App\Events\DeliveryUpdated::dispatch($delivery);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Reverb broadcast error: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Delay notification sent to customer successfully.',
            'delivery' => $delivery->fresh()->load(['request.customer', 'driver.user', 'vehicle']),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PING DRIVER FOR STATUS / DELAY REASON
    |--------------------------------------------------------------------------
    */
    public function pingDriver(Request $request, Delivery $delivery)
    {
        $validated = $request->validate([
            'inquiry_type' => 'required|string|max:100',
            'note' => 'nullable|string|max:500',
        ]);

        $delCode = 'DLV' . str_pad($delivery->delivery_id, 4, '0', STR_PAD_LEFT);
        $typeLabels = [
            'traffic' => 'Heavy traffic check',
            'weather' => 'Adverse weather check',
            'mechanical' => 'Vehicle mechanical status inquiry',
            'rest_stop' => 'Mandatory rest stop inquiry',
            'general' => 'Status and progress check',
        ];
        $label = $typeLabels[$validated['inquiry_type']] ?? 'Status inquiry';
        $note = !empty($validated['note']) ? " Note: {$validated['note']}" : '';

        $driver = $delivery->driver;
        if ($driver && $driver->user_id) {
            AppNotification::notify(
                'driver_inquiry',
                "Urgent Dispatch Inquiry (#{$delCode})",
                "Dispatch requested a {$label} for shipment #{$delCode}.{$note} Please confirm your current status.",
                '/driver/tasks',
                $driver->user_id
            );
        }

        DeliveryTracking::create([
            'delivery_id' => $delivery->delivery_id,
            'status_update' => 'driver_pinged',
        ]);

        try {
            \App\Events\DeliveryUpdated::dispatch($delivery);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Reverb broadcast error: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Status check alert sent to driver device.',
            'delivery' => $delivery->fresh()->load(['request.customer', 'driver.user', 'vehicle']),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RECORD DELAY REASON & REVISED ETA
    |--------------------------------------------------------------------------
    */
    public function recordDelayReason(Request $request, Delivery $delivery)
    {
        $validated = $request->validate([
            'delay_reason' => 'required|string|max:255',
            'revised_eta' => 'nullable|date',
            'remarks' => 'nullable|string|max:500',
        ]);

        $delivery->update([
            'delay_reason' => $validated['delay_reason'],
            'estimated_delivery_date' => $validated['revised_eta'] ?? $delivery->estimated_delivery_date,
            'remarks' => $validated['remarks'] ?? $delivery->remarks,
        ]);

        try {
            \App\Events\DeliveryUpdated::dispatch($delivery);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Reverb broadcast error: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Delay details saved.',
            'delivery' => $delivery->fresh()->load(['request.customer', 'driver.user', 'vehicle']),
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