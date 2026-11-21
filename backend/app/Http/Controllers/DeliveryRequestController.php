<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DeliveryRequestController extends Controller
{
    private function storePermitFile($fileInput, $folder = 'permits/items'): ?string
    {
        if (empty($fileInput)) {
            return null;
        }

        if ($fileInput instanceof \Illuminate\Http\UploadedFile) {
            $filename = 'item_permit_' . time() . '_' . Str::random(8) . '.' . $fileInput->getClientOriginalExtension();
            return $fileInput->storeAs($folder, $filename, 'public');
        }

        if (is_string($fileInput) && str_starts_with($fileInput, 'data:image/')) {
            try {
                if (preg_match('/^data:image\/(\w+);base64,/', $fileInput, $matches)) {
                    $ext = strtolower($matches[1]);
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
                        $ext = 'jpg';
                    }
                    $base64Data = substr($fileInput, strpos($fileInput, ',') + 1);
                    $decoded = base64_decode($base64Data);
                    if ($decoded !== false) {
                        $filename = 'item_permit_' . time() . '_' . Str::random(8) . '.' . $ext;
                        Storage::disk('public')->put($folder . '/' . $filename, $decoded);
                        return $folder . '/' . $filename;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to decode item permit image: ' . $e->getMessage());
            }
        }

        if (is_string($fileInput) && !str_starts_with($fileInput, 'data:image/')) {
            return $fileInput;
        }

        return null;
    }
    public function index(Request $request)
    {
        $query = DeliveryRequest::with(['customer', 'approver.role'])->latest('request_id');

        if ($request->boolean('scheduled')) {
            $query->where('is_scheduled', true);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('scheduled_date', [$request->start_date, $request->end_date]);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:users,user_id',
            'item_name' => 'nullable|string|max:150',
            'cargo_type' => 'nullable|string|max:100',
            'fragility' => 'nullable|in:low,medium,high',
            'weight' => 'nullable|numeric',
            'pickup_address' => 'nullable|string',
            'dropoff_address' => 'nullable|string',
            'receiver_name' => 'nullable|string|max:100',
            'receiver_phone' => 'nullable|string|max:30',
            'distance_km' => 'nullable|numeric',
            'total_price' => 'nullable|numeric',
            'payment_term' => 'nullable|in:downpayment,full',
            'payment_method' => 'nullable|in:bank_transfer,cash',
            'is_scheduled' => 'nullable|boolean',
            'scheduled_date' => 'nullable|date|after_or_equal:today',
            'scheduled_time_slot' => 'nullable|string|max:100',
            'status' => 'required|in:draft,pending,approved,rejected',
            'item_permit_type' => 'nullable|string|max:100',
            'service_type' => 'nullable|string|max:50',
            'container_number' => 'nullable|string|max:50',
            'seal_number' => 'nullable|string|max:50',
        ], [
            'scheduled_date.after_or_equal' => 'The scheduled delivery date cannot be in the past.',
        ]);

        $data = $request->all();
        if ($request->boolean('is_scheduled')) {
            $data['is_scheduled'] = true;
        } else {
            $data['is_scheduled'] = false;
            $data['scheduled_date'] = null;
            $data['scheduled_time_slot'] = null;
        }

        if ($request->hasFile('item_permit')) {
            $data['item_permit_path'] = $this->storePermitFile($request->file('item_permit'));
        } elseif ($request->filled('item_permit')) {
            $data['item_permit_path'] = $this->storePermitFile($request->input('item_permit'));
        }

        return DeliveryRequest::create($data);
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
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:50|unique:users,username',
            'password' => 'nullable|string|min:6',
            'item_name' => 'nullable|string|max:150',
            'cargo_type' => 'nullable|string|max:100',
            'fragility' => 'nullable|in:low,medium,high',
            'weight' => 'nullable|numeric',
            'pickup_address' => 'nullable|string',
            'pickup_lat' => 'nullable|numeric',
            'pickup_lng' => 'nullable|numeric',
            'dropoff_address' => 'nullable|string',
            'dropoff_lat' => 'nullable|numeric',
            'dropoff_lng' => 'nullable|numeric',
            'receiver_name' => 'nullable|string|max:100',
            'receiver_phone' => 'nullable|string|max:30',
            'distance_km' => 'nullable|numeric',
            'total_price' => 'nullable|numeric',
            'payment_term' => 'nullable|in:downpayment,full',
            'payment_method' => 'nullable|in:bank_transfer,cash',
            'bank_name' => 'nullable|string|max:100',
            'account_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'payment_receipt' => 'nullable|file|image|max:10240',
            'item_permit' => 'nullable',
            'item_permit_type' => 'nullable|string|max:100',
            'is_scheduled' => 'nullable|boolean',
            'scheduled_date' => 'nullable|date|after_or_equal:today',
            'scheduled_time_slot' => 'nullable|string|max:100',
            'is_draft' => 'nullable|boolean',
        ], [
            'scheduled_date.after_or_equal' => 'The scheduled delivery date cannot be in the past.',
        ]);

        $customerRole = Role::where('role_name', 'Customer')->first();

        // Auto-generate secure temporary password (e.g. HJY@847291)
        $tempPassword = $request->filled('password')
            ? $request->password
            : 'HJY@' . random_int(100000, 999999);

        // Generate 6-digit OTP verification code valid for 15 minutes
        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        // Auto-derive username if not provided
        $username = $request->filled('username')
            ? $request->username
            : $this->uniqueUsername($request->email);

        $deliveryRequest = DB::transaction(function () use ($request, $customerRole, $tempPassword, $otp, $username) {
            $user = User::create([
                'role_id' => $customerRole?->role_id,
                'full_name' => trim($request->first_name . ' ' . $request->last_name),
                'email' => $request->email,
                'username' => $username,
                'phone' => $request->phone,
                'gender' => 'Other',
                'date_of_birth' => '2000-01-01',
                'password' => Hash::make($tempPassword),
                'email_verified_at' => null,
                'verification_code' => $otp,
                'verification_code_expires_at' => now()->addMinutes(15),
                'status' => 'active',
            ]);

            $receiptPath = null;
            if ($request->hasFile('payment_receipt')) {
                $receiptPath = $request->file('payment_receipt')->store('receipts', 'public');
            }

            $permitPath = null;
            if ($request->hasFile('item_permit')) {
                $permitPath = $this->storePermitFile($request->file('item_permit'));
            } elseif ($request->filled('item_permit')) {
                $permitPath = $this->storePermitFile($request->input('item_permit'));
            }

            $totalPrice = $request->total_price;
            if ($totalPrice === null || $totalPrice === '') {
                $setting = SystemSetting::getSettings();
                $totalPrice = round(
                    ((float) ($request->distance_km ?? 0) * (float) $setting->distance_rate) +
                    ((float) ($request->weight ?? 0) * (float) $setting->weight_rate) +
                    (float) $setting->base_labor_fee,
                    2
                );
            }

            return DeliveryRequest::create([
                'customer_id' => $user->user_id,
                'item_name' => $request->item_name,
                'cargo_type' => $request->cargo_type,
                'fragility' => $request->fragility,
                'weight' => $request->weight,
                'pickup_address' => $request->pickup_address,
                'pickup_lat' => $request->pickup_lat,
                'pickup_lng' => $request->pickup_lng,
                'dropoff_address' => $request->dropoff_address,
                'dropoff_lat' => $request->dropoff_lat,
                'dropoff_lng' => $request->dropoff_lng,
                'receiver_name' => $request->receiver_name,
                'receiver_phone' => $request->receiver_phone,
                'distance_km' => $request->distance_km,
                'total_price' => $totalPrice,
                'payment_term' => $request->payment_term,
                'payment_method' => $request->payment_method,
                'payment_receipt_path' => $receiptPath,
                'item_permit_path' => $permitPath,
                'item_permit_type' => $request->item_permit_type,
                'bank_name' => $request->bank_name,
                'account_name' => $request->account_name,
                'account_number' => $request->account_number,
                'is_scheduled' => $request->boolean('is_scheduled'),
                'scheduled_date' => $request->boolean('is_scheduled') ? $request->scheduled_date : null,
                'scheduled_time_slot' => $request->boolean('is_scheduled') ? $request->scheduled_time_slot : null,
                'status' => $request->boolean('is_draft') ? 'draft' : 'pending',
            ]);
        });

        // Send email with credentials and OTP code to customer
        try {
            $createdUser = $deliveryRequest->customer ?: User::find($deliveryRequest->customer_id);
            if ($createdUser && !empty($createdUser->email)) {
                $this->sendCustomerWelcomeEmail($createdUser, $tempPassword, $otp);
            }
        } catch (\Throwable $emailErr) {
            Log::error('Failed to send customer welcome/OTP email: ' . $emailErr->getMessage());
        }

        if (!$request->boolean('is_draft')) {
            $customerName = $deliveryRequest->customer?->full_name ?: 'Customer';
            AppNotification::notify('request', 'New Delivery Request', "{$customerName} submitted a new delivery request (" . ($deliveryRequest->cargo_type ?: 'Cargo') . ").", '/requests');
        }

        return $deliveryRequest->load('customer');
    }

    private function uniqueUsername(string $email): string
    {
        $base = preg_replace('/[^a-z0-9_]/', '', strtolower(strstr($email, '@', true))) ?: 'customer';
        $username = substr($base, 0, 42);
        $suffix = 1;

        while (User::where('username', $username)->exists()) {
            $username = substr($base, 0, 42) . $suffix;
            $suffix++;
        }

        return $username;
    }

    private function sendCustomerWelcomeEmail(User $user, string $tempPassword, string $otp): void
    {
        $customerName = e($user->full_name ?: 'Valued Customer');
        $customerEmail = e($user->email);
        $tempPasswordSafe = e($tempPassword);

        Mail::send([], [], function ($message) use ($user, $customerName, $customerEmail, $tempPasswordSafe, $otp) {
            $message->to($user->email)
                ->subject('HJY Trucking Services - Your Customer Account & Verification Code')
                ->html("
                    <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;'>
                        <div style='text-align: center; margin-bottom: 24px;'>
                            <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;'>HJY Trucking Services</h2>
                            <p style='color: #64748b; font-size: 13px; margin: 4px 0 0; letter-spacing: 0.5px;'>ACCOUNT & DELIVERY DETAILS</p>
                        </div>
                        <p style='color: #334155; font-size: 15px; margin-bottom: 16px;'>Hello <strong>{$customerName}</strong>,</p>
                        <p style='color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;'>A delivery request has been registered for you by our team! An account has been created so you can monitor your cargo in real-time using the <strong>HJY Customer Mobile App</strong>.</p>
                        
                        <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;'>
                            <h4 style='color: #0f172a; margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Your Mobile App Login Credentials</h4>
                            <p style='margin: 6px 0; color: #475569; font-size: 14px;'><strong>Login Email:</strong> <span style='color: #0f172a;'>{$customerEmail}</span></p>
                            <p style='margin: 6px 0; color: #475569; font-size: 14px;'><strong>Temporary Password:</strong> <code style='background: #fee2e2; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold; color: #b91c1c;'>{$tempPasswordSafe}</code></p>
                        </div>

                        <div style='text-align: center; margin: 24px 0;'>
                            <p style='color: #334155; font-size: 14px; margin-bottom: 8px;'>Your 6-Digit Email Verification Code:</p>
                            <div style='display: inline-block; background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 14px 32px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #dc2626;'>
                                {$otp}
                            </div>
                            <p style='color: #64748b; font-size: 12px; margin-top: 8px;'>Valid for 15 minutes</p>
                        </div>

                        <div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;'>
                            <p style='color: #1e40af; font-size: 13px; line-height: 1.5; margin: 0;'>
                                <strong>Instructions:</strong> Open the HJY Customer Mobile App, log in using your <strong>email address</strong> and the <strong>temporary password</strong> above, then enter the 6-digit verification code. Once logged in, you can update your password to your own anytime in Settings.
                            </p>
                        </div>

                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                        <p style='color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5; text-align: center;'>HJY Trucking Services &bull; Cagayan de Oro City, Mindanao, Philippines</p>
                    </div>
                ");
        });
    }

    public function storeForCustomer(Request $request)
    {
        $user = $request->user()->load('role');

        if (strcasecmp($user->role?->role_name ?? '', 'Customer') !== 0) {
            return response()->json(['message' => 'Only customers can create delivery requests.'], 403);
        }

        $fieldRule = $request->boolean('is_draft') ? 'nullable' : 'required';
        $validated = $request->validate([
            'item_name' => "$fieldRule|string|max:150",
            'cargo_type' => "$fieldRule|string|max:100",
            'fragility' => "$fieldRule|in:low,medium,high",
            'weight' => "$fieldRule|numeric|min:0.01",
            'pickup_address' => "$fieldRule|string",
            'pickup_lat' => "$fieldRule|numeric|between:-90,90",
            'pickup_lng' => "$fieldRule|numeric|between:-180,180",
            'dropoff_address' => "$fieldRule|string",
            'dropoff_lat' => "$fieldRule|numeric|between:-90,90",
            'dropoff_lng' => "$fieldRule|numeric|between:-180,180",
            'receiver_name' => 'nullable|string|max:100',
            'receiver_phone' => 'nullable|string|max:30',
            'distance_km' => 'nullable|numeric|min:0',
            'total_price' => 'nullable|numeric|min:0',
            'payment_term' => "$fieldRule|in:downpayment,full",
            'payment_method' => "$fieldRule|in:bank_transfer,cash",
            'payment_receipt' => 'nullable|image|max:5120',
            'item_permit' => 'nullable',
            'item_permit_type' => 'nullable|string|max:100',
            'service_type' => 'nullable|string|max:50',
            'container_number' => 'nullable|string|max:50',
            'seal_number' => 'nullable|string|max:50',
            'is_scheduled' => 'nullable|boolean',
            'scheduled_date' => 'nullable|date|after_or_equal:today',
            'scheduled_time_slot' => 'nullable|string|max:100',
            'is_draft' => 'nullable|boolean',
        ], [
            'scheduled_date.after_or_equal' => 'The scheduled delivery date cannot be in the past.',
        ]);

        if (
            !$request->boolean('is_draft') &&
            ($validated['payment_method'] ?? null) === 'bank_transfer' &&
            !$request->hasFile('payment_receipt')
        ) {
            return response()->json([
                'message' => 'Upload the bank transfer receipt before completing the request.'
            ], 422);
        }

        unset($validated['payment_receipt'], $validated['is_draft']);
        
        $setting = SystemSetting::getSettings();
        $validated['total_price'] = round(
            ((float) ($validated['distance_km'] ?? 0) * (float) $setting->distance_rate) +
            ((float) ($validated['weight'] ?? 0) * (float) $setting->weight_rate) +
            (float) $setting->base_labor_fee,
            2
        );


        if ($request->hasFile('payment_receipt')) {
            $validated['payment_receipt_path'] = $request->file('payment_receipt')
                ->store('payment-receipts', 'public');
        }

        if ($request->hasFile('item_permit')) {
            $validated['item_permit_path'] = $this->storePermitFile($request->file('item_permit'));
        } elseif ($request->filled('item_permit')) {
            $validated['item_permit_path'] = $this->storePermitFile($request->input('item_permit'));
        }

        $validated['is_scheduled'] = $request->boolean('is_scheduled');
        $validated['scheduled_date'] = $request->boolean('is_scheduled') ? $request->scheduled_date : null;
        $validated['scheduled_time_slot'] = $request->boolean('is_scheduled') ? $request->scheduled_time_slot : null;

        $deliveryRequest = DeliveryRequest::create(array_merge($validated, [
            'customer_id' => $user->user_id,
            'status' => $request->boolean('is_draft') ? 'draft' : 'pending',
        ]));

        if (!$request->boolean('is_draft')) {
            $customerName = $user->full_name ?: 'Customer';
            AppNotification::notify('request', 'New Delivery Request', "{$customerName} submitted a new delivery request (" . ($deliveryRequest->cargo_type ?: 'Cargo') . ").", '/requests');
        }

        return response()->json($deliveryRequest->load('customer'), 201);
    }

    public function myRequests(Request $request)
    {
        return DeliveryRequest::with([
            'customer',
            'delivery.driver.user',
            'delivery.vehicle',
            'delivery.reviews',
            'delivery.receiptIssuer',
            'delivery.incidents',
        ])
            ->where('customer_id', $request->user()->user_id)
            ->orderByDesc('request_id')
            ->get();
    }

    public function show(DeliveryRequest $deliveryRequest)
    {
        return $deliveryRequest->load(['customer', 'approver.role']);
    }

    public function update(Request $request, DeliveryRequest $deliveryRequest)
    {
        $data = $request->all();

        if ($request->hasFile('item_permit')) {
            $data['item_permit_path'] = $this->storePermitFile($request->file('item_permit'));
        } elseif ($request->filled('item_permit') && (str_starts_with($request->input('item_permit'), 'data:') || str_starts_with($request->input('item_permit'), 'http'))) {
            $data['item_permit_path'] = $this->storePermitFile($request->input('item_permit'));
        }

        $deliveryRequest->update($data);

        return $deliveryRequest->fresh()->load(['customer', 'approver.role']);
    }

    public function uploadItemPermit(Request $request, DeliveryRequest $deliveryRequest)
    {
        $permitPath = null;
        if ($request->hasFile('item_permit')) {
            $permitPath = $this->storePermitFile($request->file('item_permit'));
        } elseif ($request->filled('item_permit')) {
            $permitPath = $this->storePermitFile($request->input('item_permit'));
        }

        if (!$permitPath) {
            return response()->json(['message' => 'Please provide a valid permit image or document.'], 422);
        }

        $deliveryRequest->update([
            'item_permit_path' => $permitPath,
            'item_permit_type' => $request->input('item_permit_type') ?: ($deliveryRequest->item_permit_type ?: 'Quarantine / Special Cargo Clearance'),
        ]);

        return response()->json([
            'message' => 'Item delivery permit uploaded successfully.',
            'request' => $deliveryRequest->fresh()->load(['customer', 'approver.role']),
        ]);
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
        $admin = auth()->user();

        $delivery = DB::transaction(function () use ($deliveryRequest, $admin) {
            $deliveryRequest->update([
                'status' => 'approved',
                'approved_by' => $admin?->user_id,
                'approved_at' => now(),
            ]);

            $totalPrice = $deliveryRequest->total_price ?? 0;
            $tripCost = $deliveryRequest->payment_term === 'downpayment'
                ? round($totalPrice / 2, 2)
                : $totalPrice;

            return Delivery::create([
                'request_id' => $deliveryRequest->request_id,
                'status' => 'pending',
                'trip_cost' => $tripCost,
                'payment_verification' => 'approved',
            ]);
        });

        AppNotification::notify('dispatch', 'Request Approved for Dispatch', 'Delivery Request #REQ' . str_pad($deliveryRequest->request_id, 4, '0', STR_PAD_LEFT) . ' was approved and is ready for dispatch.', '/dispatch');

        if ($deliveryRequest->customer_id) {
            $reqCode = '#REQ' . str_pad($deliveryRequest->request_id, 4, '0', STR_PAD_LEFT);
            $cargo = $deliveryRequest->cargo_type ?: 'Cargo';
            AppNotification::notify(
                'request_approved',
                "Request Approved ({$reqCode})",
                "Your delivery request {$reqCode} ({$cargo}) has been approved and is queued for driver assignment.",
                '/deliveries',
                $deliveryRequest->customer_id
            );
        }

        return response()->json([
            'request' => $deliveryRequest->fresh()->load(['customer', 'approver.role']),
            'delivery' => $delivery,
        ]);
    }

    public function destroy(DeliveryRequest $deliveryRequest)
    {
        $user = auth()->user();
        if ($user && strcasecmp($user->role?->role_name ?? '', 'Customer') === 0 && $deliveryRequest->customer_id !== $user->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $deliveryRequest->delete();

        return response()->json([
            'message' => 'Delivery Request deleted successfully.'
        ]);
    }
}