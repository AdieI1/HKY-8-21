<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class DriverController extends Controller
{
    public function index()
    {
        // Auto-sync: if driver is marked busy but has no active ongoing deliveries, reset to available
        Driver::where('availability_status', 'busy')
            ->whereDoesntHave('deliveries', function ($q) {
                $q->whereNotIn('status', ['completed', 'delivered', 'rejected', 'cancelled']);
            })
            ->update(['availability_status' => 'available']);

        return Driver::with([
            'user',
            'deliveries' => function ($q) {
                $q->with(['vehicle', 'request.customer', 'incidents'])->orderByDesc('delivery_id');
            }
        ])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:50|unique:users,username',
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'password' => 'nullable|min:6',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',

            'license_number' => ['nullable', 'string', 'regex:/^[A-Z]\d{2}-\d{2}-\d{6}$/i'],
            'license_type' => 'nullable|string|max:50',
            'restriction_code' => 'nullable|string|max:50',
            'license_date_issued' => 'nullable|date',
            'license_expiry_date' => 'nullable|date',
            'authorized_by' => 'nullable|string|max:100',
            'license_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',

            'availability_status' => 'nullable|in:available,busy,offline',

            'experience_years' => 'nullable|integer|min:0',
            'health_condition' => 'nullable|string|max:255',
            'birthdate' => 'nullable|date|before_or_equal:today',
            'nationality' => 'nullable|string|max:50',
            'last_medical_check' => 'nullable|date',
            'prescriptions' => 'nullable|string',
            'existing_conditions' => 'nullable|string',
            'medical_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',

            'clearance_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'clearance_type' => 'nullable|string|max:50',
            'clearance_date' => 'nullable|date',

            'date_hired' => 'nullable|date',
            'hired_by' => 'nullable|string|max:100',
            'contract_start' => 'nullable|date',
            'contract_end' => 'nullable|date',
        ]);

        $driverRole = Role::where(
            'role_name',
            'like',
            '%driver%'
        )->first();

        $photoPath = null;
        if ($request->hasFile('profile_photo')) {
            $photoPath = $request->file('profile_photo')->store('profile-photos', 'public');
        } elseif ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('profile-photos', 'public');
        }

        $docPaths = [];
        foreach (['license_file', 'medical_certificate_file', 'clearance_file'] as $docField) {
            if ($request->hasFile($docField)) {
                $docPaths[$docField] = $request->file($docField)->store('drivers/documents', 'public');
            }
        }

        // Generate cryptographically secure temporary password if not provided
        $tempPassword = $request->filled('password')
            ? $request->password
            : 'HJY@' . random_int(100000, 999999);

        $driver = DB::transaction(function () use (
            $request,
            $driverRole,
            $photoPath,
            $docPaths,
            $tempPassword
        ) {
            $user = User::create([
                'role_id' => $driverRole?->role_id,
                'full_name' => $request->full_name,
                'email' => $request->email,
                'username' => $request->username,
                'phone' => $request->phone,
                'profile_photo_path' => $photoPath,
                'password' => Hash::make($tempPassword),
                'must_change_password' => true,
                'status' => 'active',
            ]);

            return Driver::create([
                'user_id' => $user->user_id,

                'license_number' => $request->license_number,
                'license_type' => $request->license_type,
                'restriction_code' => $request->restriction_code,
                'license_date_issued' => $request->license_date_issued,
                'license_expiry_date' => $request->license_expiry_date,
                'authorized_by' => $request->authorized_by,
                'license_file' => $docPaths['license_file'] ?? null,

                'availability_status' =>
                    $request->availability_status ?? 'available',

                'experience_years' =>
                    $request->experience_years ?? 0,

                'health_condition' =>
                    $request->health_condition ?? 'Not specified',

                'birthdate' => $request->birthdate,
                'nationality' => $request->nationality,
                'last_medical_check' => $request->last_medical_check,
                'prescriptions' => $request->prescriptions,
                'existing_conditions' => $request->existing_conditions,
                'medical_certificate_file' => $docPaths['medical_certificate_file'] ?? null,

                'clearance_file' => $docPaths['clearance_file'] ?? null,
                'clearance_type' => $request->clearance_type ?? 'NBI Clearance',
                'clearance_date' => $request->clearance_date,

                'date_hired' => $request->date_hired,
                'hired_by' => $request->hired_by,
                'contract_start' => $request->contract_start,
                'contract_end' => $request->contract_end,

                'status' => 'active',
            ]);
        });

        // Send email with credentials to the driver (OWASP Zero-Knowledge Delivery)
        try {
            $createdUser = $driver->user ?: User::find($driver->user_id);
            if ($createdUser && !empty($createdUser->email)) {
                $this->sendDriverWelcomeEmail($createdUser, $tempPassword);
            }
        } catch (\Throwable $emailErr) {
            Log::error('Failed to send driver welcome credentials email: ' . $emailErr->getMessage());
        }

        $driverName = $driver->user?->full_name ?: 'Driver';
        AppNotification::notify('driver', 'New Driver Added', "Driver {$driverName} has been registered.", '/drivers');

        return $driver->load('user');
    }

    private function sendDriverWelcomeEmail(User $user, string $tempPassword): void
    {
        $driverName = e($user->full_name ?: 'Driver');
        $driverEmail = e($user->email);
        $tempPasswordSafe = e($tempPassword);

        Mail::send([], [], function ($message) use ($user, $driverName, $driverEmail, $tempPasswordSafe) {
            $message->to($user->email)
                ->subject('HJY Trucking Services - Your Driver Account & Temporary Password')
                ->html("
                    <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
                        <div style='text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #b91c1c;'>
                            <h2 style='color: #b91c1c; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;'>HJY TRUCKING SERVICES</h2>
                            <p style='color: #64748b; font-size: 13px; margin: 4px 0 0; font-weight: 600;'>FLEET DRIVER ONBOARDING & CREDENTIALS</p>
                        </div>
                        <p style='color: #1e293b; font-size: 15px; margin-bottom: 12px;'>Hello <strong>{$driverName}</strong>,</p>
                        <p style='color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;'>
                            Welcome to the <strong>HJY Trucking Services</strong> fleet team! An official driver profile has been created for you by dispatch operations. You can now sign in to the <strong>HJY Driver Mobile App</strong> to manage assigned trips, conduct pre-trip safety checks, and view turn-by-turn routes.
                        </p>
                        
                        <div style='background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px;'>
                            <h4 style='color: #0f172a; margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;'>Your Initial Login Credentials</h4>
                            <p style='margin: 8px 0; color: #475569; font-size: 14px;'><strong>Login Email:</strong> <span style='color: #0f172a; font-weight: 600;'>{$driverEmail}</span></p>
                            <p style='margin: 8px 0; color: #475569; font-size: 14px;'><strong>Temporary Password:</strong> <code style='background: #fee2e2; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 5px; font-family: monospace; font-size: 15px; font-weight: 800; color: #b91c1c; letter-spacing: 0.5px;'>{$tempPasswordSafe}</code></p>
                        </div>

                        <div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;'>
                            <h5 style='margin: 0 0 6px; color: #1e40af; font-size: 13.5px; font-weight: 700;'>
                                Security Notice (OWASP ASVS Standard):
                            </h5>
                            <p style='color: #1e3a8a; font-size: 13px; line-height: 1.5; margin: 0;'>
                                This temporary password is for your initial login only. For your security and account confidentiality, you will be prompted to <strong>choose a new permanent password</strong> upon your first sign-in on the mobile app.
                            </p>
                        </div>

                        <div style='background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;'>
                            <h5 style='margin: 0 0 8px; color: #334155; font-size: 13px; font-weight: 700;'>Quick Sign-In Steps:</h5>
                            <ol style='margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;'>
                                <li>Launch the <strong>HJY Driver Mobile App</strong> on your mobile device.</li>
                                <li>Enter your email <strong>{$driverEmail}</strong> and the temporary password above.</li>
                                <li>Set your personal, confidential password to activate your account.</li>
                            </ol>
                        </div>

                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                        <p style='color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5; text-align: center;'>HJY Trucking Services &bull; Cagayan de Oro City, Mindanao, Philippines<br>This is an automated operational notification. Please do not reply directly to this email.</p>
                    </div>
                ");
        });
    }

    public function show(Driver $driver)
    {
        return $driver->load([
            'user',
            'deliveries' => function ($q) {
                $q->with(['vehicle', 'request.customer', 'incidents'])->orderByDesc('delivery_id');
            },
            'permits',
            'driverLogs',
        ]);
    }

    public function update(Request $request, Driver $driver)
    {
        $request->validate([
            'email' =>
                'nullable|email|unique:users,email,' .
                $driver->user_id .
                ',user_id',

            'username' =>
                'nullable|string|max:50|unique:users,username,' .
                $driver->user_id .
                ',user_id',

            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'birthdate' => 'nullable|date|before_or_equal:today',
            'license_number' => ['nullable', 'string', 'regex:/^[A-Z]\d{2}-\d{2}-\d{6}$/i'],
            'license_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'medical_certificate_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'clearance_file' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'clearance_type' => 'nullable|string|max:50',
            'clearance_date' => 'nullable|date',

            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',

            'availability_status' =>
                'nullable|in:available,busy,offline',

            'status' =>
                'nullable|in:active,inactive',
        ]);

        $oldEmail = $driver->user?->email;
        $newEmail = $request->input('email');
        $emailChanged = $newEmail && strtolower(trim($newEmail)) !== strtolower(trim($oldEmail ?? ''));

        $generatedTempPassword = null;
        if (($emailChanged && $driver->user?->must_change_password) || $request->boolean('resend_credentials')) {
            $generatedTempPassword = 'HJY@' . random_int(100000, 999999);
        }

        DB::transaction(function () use ($request, $driver, $generatedTempPassword) {
            $driverData = $request->only([
                'license_number',
                'license_type',
                'restriction_code',
                'license_date_issued',
                'license_expiry_date',
                'authorized_by',
                'availability_status',
                'experience_years',
                'health_condition',
                'birthdate',
                'nationality',
                'last_medical_check',
                'prescriptions',
                'existing_conditions',
                'clearance_type',
                'clearance_date',
                'date_hired',
                'hired_by',
                'contract_start',
                'contract_end',
                'status',
            ]);

            foreach (['license_file', 'medical_certificate_file', 'clearance_file'] as $docField) {
                if ($request->hasFile($docField)) {
                    $old = $driver->$docField;
                    $driverData[$docField] = $request->file($docField)->store('drivers/documents', 'public');
                    if ($old) {
                        Storage::disk('public')->delete($old);
                    }
                }
            }

            $driver->update($driverData);

            $userPayload = $request->only([
                'full_name',
                'email',
                'username',
                'phone',
            ]);

            if ($request->filled('password')) {
                $userPayload['password'] =
                    Hash::make($request->password);
            } elseif ($generatedTempPassword) {
                $userPayload['password'] =
                    Hash::make($generatedTempPassword);
                $userPayload['must_change_password'] = true;
            }

            if ($request->hasFile('profile_photo')) {
                $old = $driver->user?->profile_photo_path;
                $path = $request->file('profile_photo')->store('profile-photos', 'public');
                $userPayload['profile_photo_path'] = $path;
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
            } elseif ($request->hasFile('photo')) {
                $old = $driver->user?->profile_photo_path;
                $path = $request->file('photo')->store('profile-photos', 'public');
                $userPayload['profile_photo_path'] = $path;
                if ($old) {
                    Storage::disk('public')->delete($old);
                }
            }

            if (!empty($userPayload)) {
                $driver->user()->update($userPayload);
            }
        });

        // Automatically dispatch credentials email if temporary password was generated or email changed
        if ($generatedTempPassword) {
            $updatedUser = $driver->fresh()->user;
            if ($updatedUser && !empty($updatedUser->email)) {
                try {
                    $this->sendDriverWelcomeEmail($updatedUser, $generatedTempPassword);
                } catch (\Throwable $emailErr) {
                    Log::error('Failed to send driver credentials email on update: ' . $emailErr->getMessage());
                }
            }
        }

        $driverName = $driver->user?->full_name ?: 'Driver';
        AppNotification::notify('driver', 'Driver Updated', "Driver {$driverName} profile was updated.", '/drivers');

        return $driver->fresh()->load('user');
    }

    public function resendCredentials(Driver $driver)
    {
        $user = $driver->user;
        if (!$user || empty($user->email)) {
            return response()->json([
                'message' => 'This driver does not have a valid email address configured.'
            ], 422);
        }

        $tempPassword = 'HJY@' . random_int(100000, 999999);
        $user->password = Hash::make($tempPassword);
        $user->must_change_password = true;
        $user->save();

        try {
            $this->sendDriverWelcomeEmail($user, $tempPassword);
            return response()->json([
                'message' => "Login credentials and temporary password successfully sent to {$user->email}."
            ]);
        } catch (\Throwable $emailErr) {
            Log::error('Failed to resend driver credentials: ' . $emailErr->getMessage());
            return response()->json([
                'message' => 'Temporary password was reset, but email delivery encountered an issue: ' . $emailErr->getMessage(),
                'temp_password' => $tempPassword,
            ], 500);
        }
    }

    public function destroy(Driver $driver)
    {
        // Clean up documents and avatar from disk
        foreach (['license_file', 'medical_certificate_file', 'clearance_file'] as $docField) {
            if ($driver->$docField) {
                Storage::disk('public')->delete($driver->$docField);
            }
        }
        if ($driver->user?->profile_photo_path) {
            Storage::disk('public')->delete($driver->user->profile_photo_path);
        }

        $driver->delete();

        return response()->json([
            'message' => 'Driver deleted successfully.'
        ]);
    }
}