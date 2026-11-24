<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\DeliveryTracking;
use App\Models\FuelInventory;
use App\Models\FuelIssuance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelIssuanceController extends Controller
{
    public function index(Request $request)
    {
        $query = FuelIssuance::with([
            'fuel',
            'vehicle',
            'driver.user',
            'delivery.request.customer',
            'issuedBy',
            'receivedBy',
        ])->where(function ($q) {
            $q->where('status', 'confirmed')->orWhereNull('status');
        });

        if ($request->filled('fuel_id')) {
            $query->where('fuel_id', $request->fuel_id);
        }

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        return $query->orderByDesc('issued_at')->orderByDesc('issuance_id')->get();
    }

    public function pending()
    {
        return FuelIssuance::with([
            'fuel',
            'vehicle',
            'driver.user',
            'delivery.request.customer',
            'issuedBy',
        ])
            ->where('status', 'pending')
            ->orderByDesc('issuance_id')
            ->get();
    }

    public function confirm(Request $request, FuelIssuance $fuelIssuance)
    {
        if ($fuelIssuance->status !== 'pending') {
            return response()->json([
                'message' => 'This fuel issuance request has already been processed.',
            ], 422);
        }

        $validated = $request->validate([
            'fuel_id' => 'nullable|exists:fuel_inventory,fuel_id',
        ]);

        $targetFuelId = $validated['fuel_id'] ?? $fuelIssuance->fuel_id;
        // Liters are fixed from the dispatched trip ticket and cannot be edited here
        $liters = (float) $fuelIssuance->liters;

        try {
            $result = DB::transaction(function () use ($request, $fuelIssuance, $targetFuelId, $liters) {
                $fuel = FuelInventory::lockForUpdate()->findOrFail($targetFuelId);

                if ((float) $fuel->current_stock < $liters) {
                    throw new \RuntimeException(
                        "Insufficient {$fuel->fuel_type} stock ({$fuel->current_stock} L available, {$liters} L requested)."
                    );
                }

                $fuel->current_stock = round((float) $fuel->current_stock - $liters, 2);
                $fuel->save();

                $year = now()->format('Y');
                $receiptNo = sprintf('FR-%s-%05d', $year, $fuelIssuance->issuance_id);
                $unitPrice = (float) ($fuel->unit_price ?? $fuelIssuance->unit_price ?? 0);
                $totalValue = round($liters * $unitPrice, 2);
                $confirmerId = $request->user()?->user_id ?? $fuelIssuance->issued_by;

                $fuelIssuance->update([
                    'fuel_id' => $fuel->fuel_id,
                    'liters' => $liters,
                    'unit_price' => $unitPrice,
                    'total_value' => $totalValue,
                    'fuel_receipt_no' => $receiptNo,
                    'status' => 'confirmed',
                    'issued_by' => $confirmerId,
                    'issued_at' => now(),
                ]);

                $delivery = $fuelIssuance->delivery;
                if ($delivery) {
                    $delivery->update([
                        'fuel_issued' => $liters,
                        'starting_fuel' => $liters,
                        'fuel_receipt_no' => $receiptNo,
                        'fuel_issuance_status' => 'confirmed',
                        'status' => 'assigned',
                    ]);

                    DeliveryTracking::create([
                        'delivery_id' => $delivery->delivery_id,
                        'status_update' => 'assigned',
                    ]);

                    $delCode = 'DLV' . str_pad((string) $delivery->delivery_id, 4, '0', STR_PAD_LEFT);
                    $driverName = $delivery->driver?->user?->full_name ?: 'Driver';
                    $plate = $delivery->vehicle?->plate_number ?: 'Truck';

                    AppNotification::notify(
                        'dispatch',
                        "Fuel Issued & Trip Ready ({$delCode})",
                        "Fuel receipt {$receiptNo} ({$liters} L {$fuel->fuel_type}) confirmed for {$plate}. {$delCode} is now assigned to {$driverName} and ready for Pre-Trip Inspection.",
                        '/dispatch'
                    );

                    if ($delivery->request?->customer_id) {
                        AppNotification::notify(
                            'delivery_status',
                            "Driver Dispatched (#{$delCode})",
                            "Driver {$driverName} has been assigned to your shipment #{$delCode} and is preparing for dispatch.",
                            '/deliveries',
                            $delivery->request->customer_id
                        );
                    }
                }

                if ($fuel->reorder_level !== null && (float) $fuel->current_stock <= (float) $fuel->reorder_level) {
                    AppNotification::notify(
                        'fuel',
                        'Low Fuel Stock Alert',
                        "{$fuel->fuel_type} stock dropped to {$fuel->current_stock} L after issuing {$liters} L (Receipt {$receiptNo}).",
                        '/fuel-inventory'
                    );
                }

                return [
                    'fuel_receipt_no' => $receiptNo,
                    'issuance' => $fuelIssuance->fresh()->load(['fuel', 'vehicle', 'driver.user', 'delivery.request.customer', 'issuedBy']),
                    'delivery' => $delivery?->fresh()->load(['driver.user', 'vehicle', 'request.customer']),
                ];
            });

            if (!empty($result['delivery'])) {
                try {
                    \App\Events\DeliveryUpdated::dispatch($result['delivery']);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Reverb broadcast error: ' . $e->getMessage());
                }
            }

            return response()->json(array_merge([
                'message' => "Fuel issued ({$result['fuel_receipt_no']}) and delivery released for pre-trip inspection.",
            ], $result));
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $request, FuelIssuance $fuelIssuance)
    {
        if ($fuelIssuance->status !== 'pending') {
            return response()->json([
                'message' => 'This fuel issuance request has already been processed.',
            ], 422);
        }

        $reason = trim((string) $request->input('reason', ''));

        $updatedDelivery = null;
        DB::transaction(function () use ($fuelIssuance, $reason, &$updatedDelivery) {
            $fuelIssuance->update([
                'status' => 'rejected',
                'purpose' => trim(($fuelIssuance->purpose ?: 'Trip Fuel Request') . ($reason ? " — Returned: {$reason}" : ' — Returned to Dispatch')),
            ]);

            $delivery = $fuelIssuance->delivery;
            if ($delivery) {
                $delCode = 'DLV' . str_pad((string) $delivery->delivery_id, 4, '0', STR_PAD_LEFT);

                if ($delivery->driver) {
                    $delivery->driver()->update(['availability_status' => 'available']);
                }
                if ($delivery->vehicle) {
                    $delivery->vehicle()->update(['status' => 'available']);
                }

                $delivery->update([
                    'driver_id' => null,
                    'vehicle_id' => null,
                    'fuel_receipt_no' => null,
                    'fuel_issuance_status' => 'rejected',
                    'status' => 'pending',
                ]);

                AppNotification::notify(
                    'dispatch',
                    "Fuel Request Returned ({$delCode})",
                    "Pending fuel issuance for {$delCode} was returned to Dispatch" . ($reason ? ": {$reason}" : '. Please review fuel allocation and re-dispatch.'),
                    '/dispatch'
                );

                $updatedDelivery = $delivery->fresh();
            }
        });

        if ($updatedDelivery) {
            try {
                \App\Events\DeliveryUpdated::dispatch($updatedDelivery);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Reverb broadcast error: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Fuel request returned to Dispatch and driver/vehicle released.',
        ]);
    }

    public function show(FuelIssuance $fuelIssuance)
    {
        return $fuelIssuance->load([
            'fuel',
            'vehicle',
            'driver.user',
            'delivery.request.customer',
            'issuedBy',
            'receivedBy',
        ]);
    }
}
