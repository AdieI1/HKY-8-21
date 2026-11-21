<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function index()
    {
        return User::with('role')->get();
    }

    public function store(Request $request)
    {
        // Support split name (first_name, middle_name, last_name) or full_name
        if (!$request->filled('full_name') && $request->filled('first_name')) {
            $middlePart = $request->filled('middle_name') ? trim($request->middle_name) . ' ' : '';
            $fullName = trim($request->first_name . ' ' . $middlePart . $request->last_name);
            $request->merge(['full_name' => $fullName]);
        }

        $request->validate([
            'role_id' => 'required|exists:roles,role_id',
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'status' => 'nullable|in:active,inactive,blocked',
            'sss_number' => 'required|string|max:50',
            'philhealth_number' => 'required|string|max:50',
            'pagibig_number' => 'required|string|max:50',
            'deductible_taxes' => 'required|string|max:100',
            'password' => 'nullable|min:6',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $this->storeProfilePhoto($request->file('photo'));
        } elseif ($request->hasFile('profile_photo')) {
            $photoPath = $this->storeProfilePhoto($request->file('profile_photo'));
        } elseif ($request->filled('photo')) {
            $photoPath = $this->storeProfilePhoto($request->input('photo'));
        } elseif ($request->filled('profile_photo')) {
            $photoPath = $this->storeProfilePhoto($request->input('profile_photo'));
        }

        // Generate cryptographically secure temporary password if not provided
        $tempPassword = $request->filled('password')
            ? $request->password
            : 'HJY@' . random_int(100000, 999999);

        $user = User::create([
            'role_id' => $request->role_id,
            'full_name' => $request->full_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'sss_number' => $request->sss_number,
            'philhealth_number' => $request->philhealth_number,
            'pagibig_number' => $request->pagibig_number,
            'deductible_taxes' => $request->deductible_taxes,
            'profile_photo_path' => $photoPath,
            'password' => Hash::make($tempPassword),
            'must_change_password' => true,
            'status' => $request->status ?? 'active',
        ]);

        // Send email with credentials to staff (OWASP Zero-Knowledge Delivery)
        try {
            if (!empty($user->email)) {
                $this->sendStaffWelcomeEmail($user, $tempPassword);
            }
        } catch (\Throwable $emailErr) {
            Log::error('Failed to send staff welcome credentials email: ' . $emailErr->getMessage());
        }

        $staffName = $user->full_name ?: 'Staff';
        AppNotification::notify('staff', 'New Staff Added', "Staff member {$staffName} has been registered.", '/overview');

        return $user->load('role');
    }

    public function show(User $user)
    {
        return $user->load('role');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:100',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->user_id . ',user_id',
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'username' => 'nullable|string|max:50|unique:users,username,' . $user->user_id . ',user_id',
            'gender' => 'nullable|string|max:20',
            'date_of_birth' => [
                'nullable',
                'string',
                'max:30',
                function ($attribute, $value, $fail) {
                    if (!empty($value)) {
                        $timestamp = strtotime($value);
                        if ($timestamp !== false && $timestamp > time()) {
                            $fail('The date of birth cannot be a future date.');
                        }
                    }
                },
            ],
            'status' => 'nullable|in:active,inactive,blocked',
            'sss_number' => 'nullable|string|max:50',
            'philhealth_number' => 'nullable|string|max:50',
            'pagibig_number' => 'nullable|string|max:50',
            'deductible_taxes' => 'nullable|string|max:100',
            'photo' => 'nullable',
            'profile_photo' => 'nullable',
            'password' => 'nullable|min:6',
        ]);

        $data = $request->except(['password', 'photo', 'profile_photo']);

        $newPhotoPath = null;
        if ($request->hasFile('photo')) {
            $newPhotoPath = $this->storeProfilePhoto($request->file('photo'));
        } elseif ($request->hasFile('profile_photo')) {
            $newPhotoPath = $this->storeProfilePhoto($request->file('profile_photo'));
        } elseif ($request->filled('photo') && str_starts_with($request->input('photo'), 'data:')) {
            $newPhotoPath = $this->storeProfilePhoto($request->input('photo'));
        } elseif ($request->filled('profile_photo') && str_starts_with($request->input('profile_photo'), 'data:')) {
            $newPhotoPath = $this->storeProfilePhoto($request->input('profile_photo'));
        }

        if ($newPhotoPath) {
            $old = $user->profile_photo_path;
            $data['profile_photo_path'] = $newPhotoPath;
            if ($old) {
                Storage::disk('public')->delete($old);
            }
        }

        $oldEmail = $user->email;
        $newEmail = $data['email'] ?? null;
        $emailChanged = $newEmail && strtolower(trim($newEmail)) !== strtolower(trim($oldEmail ?? ''));

        $generatedTempPassword = null;
        if (($emailChanged && $user->must_change_password) || $request->boolean('resend_credentials')) {
            $generatedTempPassword = 'HJY@' . random_int(100000, 999999);
            $data['password'] = Hash::make($generatedTempPassword);
            $data['must_change_password'] = true;
        }

        $photoUpdated = !empty($newPhotoPath);
        $phoneUpdated = isset($data['phone']) && $data['phone'] !== $user->phone;

        $user->update($data);

        $isDriver = strtolower($user->role?->role_name ?? '') === 'driver' || $user->driver()->exists();
        if ($isDriver && ($photoUpdated || $phoneUpdated)) {
            $driverName = $user->full_name ?: 'Driver';
            $changedItems = [];
            if ($photoUpdated) $changedItems[] = 'profile picture';
            if ($phoneUpdated) $changedItems[] = 'contact number (' . $data['phone'] . ')';

            $changedText = implode(' and ', $changedItems);
            AppNotification::notify(
                'driver',
                'Driver Profile Updated',
                "Driver {$driverName} updated their {$changedText}.",
                '/drivers'
            );
        }

        if (!empty($request->password)) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        if ($generatedTempPassword && !empty($user->email)) {
            try {
                $this->sendStaffWelcomeEmail($user->fresh(), $generatedTempPassword);
            } catch (\Throwable $emailErr) {
                Log::error('Failed to send staff welcome credentials email on update: ' . $emailErr->getMessage());
            }
        }

        return $user->refresh()->load(['role', 'driver']);
    }

    public function resendCredentials(User $user)
    {
        if (empty($user->email)) {
            return response()->json([
                'message' => 'This account does not have a valid email address configured.'
            ], 422);
        }

        $tempPassword = 'HJY@' . random_int(100000, 999999);
        $user->password = Hash::make($tempPassword);
        $user->must_change_password = true;
        $user->save();

        try {
            $isDriver = strtolower($user->role?->role_name ?? '') === 'driver' || $user->driver()->exists();
            if ($isDriver) {
                app(DriverController::class)->sendDriverWelcomeEmail($user, $tempPassword);
            } else {
                $this->sendStaffWelcomeEmail($user, $tempPassword);
            }

            return response()->json([
                'message' => "Login credentials and temporary password successfully sent to {$user->email}."
            ]);
        } catch (\Throwable $emailErr) {
            Log::error('Failed to resend credentials: ' . $emailErr->getMessage());
            return response()->json([
                'message' => 'Temporary password was reset, but email delivery encountered an issue: ' . $emailErr->getMessage(),
                'temp_password' => $tempPassword,
            ], 500);
        }
    }

    public function destroy(User $user)
    {
        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.'
        ]);
    }

    private function storeProfilePhoto($fileInput): ?string
    {
        if (empty($fileInput)) {
            return null;
        }

        if ($fileInput instanceof \Illuminate\Http\UploadedFile) {
            return $fileInput->store('profile-photos', 'public');
        }

        if (is_string($fileInput) && str_starts_with($fileInput, 'data:')) {
            try {
                if (preg_match('/^data:image\/(\w+);base64,/', $fileInput, $matches)) {
                    $ext = strtolower($matches[1]);
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                        $ext = 'jpg';
                    }
                    $base64Data = substr($fileInput, strpos($fileInput, ',') + 1);
                    $decoded = base64_decode($base64Data);
                    if ($decoded !== false) {
                        $filename = 'profile_' . time() . '_' . \Illuminate\Support\Str::random(8) . '.' . $ext;
                        Storage::disk('public')->put('profile-photos/' . $filename, $decoded);
                        return 'profile-photos/' . $filename;
                    }
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return null;
    }

    private function sendStaffWelcomeEmail(User $user, string $tempPassword): void
    {
        $staffName = e($user->full_name ?: 'Staff Member');
        $staffEmail = e($user->email);
        $tempPasswordSafe = e($tempPassword);

        Mail::send([], [], function ($message) use ($user, $staffName, $staffEmail, $tempPasswordSafe) {
            $message->to($user->email)
                ->subject('HJY Trucking Services - Your Staff Account & Temporary Password')
                ->html("
                    <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
                        <div style='text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #b91c1c;'>
                            <h2 style='color: #b91c1c; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;'>HJY TRUCKING SERVICES</h2>
                            <p style='color: #64748b; font-size: 13px; margin: 4px 0 0; font-weight: 600;'>STAFF ONBOARDING & CREDENTIALS</p>
                        </div>
                        <p style='color: #1e293b; font-size: 15px; margin-bottom: 12px;'>Hello <strong>{$staffName}</strong>,</p>
                        <p style='color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;'>
                            Welcome to the <strong>HJY Trucking Services</strong> operations team! An official staff account has been created for you by the administrator. You can now sign in to the <strong>HJY Staff Web Portal</strong> and <strong>HJY Staff Mobile App</strong> to manage deliveries, inspect fleet checklists, and oversee daily logistics operations.
                        </p>
                        
                        <div style='background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px;'>
                            <h4 style='color: #0f172a; margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;'>Your Initial Login Credentials</h4>
                            <p style='margin: 8px 0; color: #475569; font-size: 14px;'><strong>Login Email:</strong> <span style='color: #0f172a; font-weight: 600;'>{$staffEmail}</span></p>
                            <p style='margin: 8px 0; color: #475569; font-size: 14px;'><strong>Temporary Password:</strong> <code style='background: #fee2e2; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 5px; font-family: monospace; font-size: 15px; font-weight: 800; color: #b91c1c; letter-spacing: 0.5px;'>{$tempPasswordSafe}</code></p>
                        </div>

                        <div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;'>
                            <h5 style='margin: 0 0 6px; color: #1e40af; font-size: 13.5px; font-weight: 700;'>
                                Mandatory Security Setup (OWASP Standard):
                            </h5>
                            <p style='color: #1e3a8a; font-size: 13px; line-height: 1.5; margin: 0;'>
                                This temporary password is for your initial login only. For account security, you will be required to <strong>choose a new permanent password</strong> upon your first sign-in on either the web login or staff mobile app.
                            </p>
                        </div>

                        <div style='background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;'>
                            <h5 style='margin: 0 0 8px; color: #334155; font-size: 13px; font-weight: 700;'>How to Get Started:</h5>
                            <ol style='margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;'>
                                <li>Navigate to the <strong>HJY Web Portal</strong> or launch the <strong>HJY Staff App</strong>.</li>
                                <li>Sign in using your email <strong>{$staffEmail}</strong> and the temporary password above.</li>
                                <li>Follow the security prompt to set your personal permanent password to activate your profile.</li>
                            </ol>
                        </div>

                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                        <p style='color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5; text-align: center;'>HJY Trucking Services &bull; Cagayan de Oro City, Mindanao, Philippines<br>This is an automated operational notification. Please do not reply directly to this email.</p>
                    </div>
                ");
        });
    }
}