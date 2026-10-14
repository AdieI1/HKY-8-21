<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:100',
            'username' => 'nullable|string|max:50|unique:users,username',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $customerRole = Role::where('role_name', 'Customer')->first();

        if (!$customerRole) {
            return response()->json(['message' => 'Customer role is not configured.'], 422);
        }

        $user = User::with('role')->where('email', $validated['email'])->first();
        $created = false;
        $username = !empty($validated['username']) ? $validated['username'] : $this->uniqueUsername($validated['email']);
        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        if ($user) {
            if (
                strcasecmp($user->role?->role_name ?? '', 'Customer') !== 0 ||
                $user->email_verified_at ||
                !Hash::check($validated['password'], $user->password)
            ) {
                return response()->json([
                    'message' => 'An account already uses this email. Please log in instead.'
                ], 422);
            }

            $user->update([
                'username' => $username,
                'email_verified_at' => null,
                'verification_code' => $otp,
                'verification_code_expires_at' => now()->addMinutes(15),
            ]);
        } else {
            $user = User::create([
                'role_id' => $customerRole->role_id,
                'full_name' => null,
                'email' => $validated['email'],
                'username' => $username,
                'phone' => null,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => null,
                'verification_code' => $otp,
                'verification_code_expires_at' => now()->addMinutes(15),
                'status' => 'active',
            ]);
            $created = true;
        }

        $emailSent = $this->trySendingVerificationEmail($user, $otp);
        $token = $user->createToken('customer_mobile')->plainTextToken;

        return response()->json([
            'message' => $emailSent
                ? 'Account created successfully. A 6-digit verification code has been sent to your email.'
                : 'Account created successfully. Please enter your verification code.',
            'user' => $user->fresh()->load('role'),
            'username' => $user->username,
            'token' => $token,
            'token_type' => 'Bearer',
            'requires_verification' => true,
            'requires_profile_setup' => true,
            'email_sent' => $emailSent,
        ], $created ? 201 : 200);
    }

    public function verify(Request $request, User $user)
    {
        if (!$request->hasValidSignature()) {
            abort(403, 'This verification link is invalid or expired.');
        }

        if (!$user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return response(
            '<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verified - HJY Trucking Services</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background-color: #f1f5f9;
                        padding: 20px;
                        box-sizing: border-box;
                    }
                    .card {
                        background: white;
                        padding: 40px 32px;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        max-width: 440px;
                        width: 100%;
                        text-align: center;
                    }
                    .icon {
                        width: 64px;
                        height: 64px;
                        background-color: #d1fae5;
                        color: #059669;
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        margin-bottom: 20px;
                    }
                    h2 { color: #0f172a; margin: 0 0 10px; }
                    p { color: #64748b; line-height: 1.5; font-size: 15px; margin: 0; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">&#10003;</div>
                    <h2>Email Verified Successfully!</h2>
                    <p>Your account is now verified. You can return to the HJY Customer App and continue.</p>
                </div>
            </body>
            </html>',
            200,
            ['Content-Type' => 'text/html']
        );
    }

    public function verifyCode(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        $validated = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        if (
            !$user->verification_code ||
            $user->verification_code !== $validated['code'] ||
            !$user->verification_code_expires_at ||
            $user->verification_code_expires_at->isPast()
        ) {
            return response()->json([
                'message' => 'The verification code is invalid or has expired. Please request a new code.'
            ], 422);
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ])->save();

        return response()->json([
            'message' => 'Email verified successfully!',
            'verified' => true,
            'user' => $user->fresh()->load('role'),
            'requires_profile_setup' => !$user->fresh()->profile_completed,
        ]);
    }

    public function resend(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        $otp = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $user->forceFill([
            'verification_code' => $otp,
            'verification_code_expires_at' => now()->addMinutes(15),
        ])->save();

        if (!$this->trySendingVerificationEmail($user, $otp)) {
            return response()->json([
                'message' => 'Verification code could not be sent. Please try again later.'
            ], 503);
        }

        return response()->json(['message' => 'A new 6-digit verification code has been sent to your email.']);
    }

    public function status(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        return response()->json([
            'verified' => (bool) $user->email_verified_at,
            'requires_profile_setup' => !$user->profile_completed,
            'user' => $user->load('role'),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        $validated = $request->validate([
            'first_name' => 'nullable|string|max:50',
            'last_name' => 'nullable|string|max:50',
            'full_name' => 'nullable|string|max:100',
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'gender' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|string|max:30',
            'photo' => 'nullable|file|image|max:10240',
        ]);

        $fullName = null;
        if (!empty($validated['first_name']) || !empty($validated['last_name'])) {
            $fullName = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
        } elseif (!empty($validated['full_name'])) {
            $fullName = trim($validated['full_name']);
        }

        $dataToUpdate = [];
        if ($fullName !== null) {
            $dataToUpdate['full_name'] = $fullName;
        }
        if (array_key_exists('phone', $validated)) {
            $dataToUpdate['phone'] = $validated['phone'];
        }
        if (array_key_exists('gender', $validated)) {
            $dataToUpdate['gender'] = $validated['gender'];
        }
        if (array_key_exists('date_of_birth', $validated)) {
            $dataToUpdate['date_of_birth'] = $validated['date_of_birth'];
        }
        if ($request->hasFile('photo')) {
            $dataToUpdate['profile_photo_path'] = $request->file('photo')->store('profile-photos', 'public');
        }

        if (!empty($dataToUpdate)) {
            $user->update($dataToUpdate);
        }

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh()->load('role'),
            'username' => $user->username,
            'profile_completed' => (bool) $user->fresh()->profile_completed,
        ]);
    }

    private function uniqueUsername(string $email): string
    {
        $base = preg_replace('/[^a-z0-9_]/', '', strtolower(strstr($email, '@', true))) ?: 'customer';
        $username = substr($base, 0, 42);
        $suffix = 1;

        while (User::where('username', $username)->exists()) {
            $username = substr($base, 0, 42).$suffix;
            $suffix++;
        }

        return $username;
    }

    private function trySendingVerificationEmail(User $user, ?string $otp = null): bool
    {
        try {
            $this->sendVerificationEmail($user, $otp);
            return true;
        } catch (\Throwable $error) {
            report($error);
            return false;
        }
    }

    private function sendVerificationEmail(User $user, ?string $otp = null): void
    {
        $code = $otp ?? $user->verification_code;
        if (!$code) {
            $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $user->forceFill([
                'verification_code' => $code,
                'verification_code_expires_at' => now()->addMinutes(15),
            ])->save();
        }

        $usernameSafe = e($user->username ?? 'Customer');

        Mail::send([], [], function ($message) use ($user, $code, $usernameSafe) {
            $message->to($user->email)
                ->subject('HJY Trucking Services - Your 6-Digit Verification Code')
                ->html("
                    <div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;'>
                        <div style='text-align: center; margin-bottom: 24px;'>
                            <h2 style='color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;'>HJY Trucking Services</h2>
                            <p style='color: #64748b; font-size: 13px; margin: 4px 0 0; letter-spacing: 0.5px;'>ACCOUNT EMAIL VERIFICATION</p>
                        </div>
                        <p style='color: #334155; font-size: 15px; margin-bottom: 16px;'>Hello <strong>{$usernameSafe}</strong>,</p>
                        <p style='color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 20px;'>Thank you for signing up with HJY Trucking Services! Please use the following 6-digit code to verify your account:</p>
                        <div style='text-align: center; margin: 28px 0;'>
                            <div style='display: inline-block; background-color: #f8fafc; border: 2px dashed #0f766e; border-radius: 12px; padding: 16px 36px; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #0f766e;'>
                                {$code}
                            </div>
                        </div>
                        <p style='color: #64748b; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 24px;'>This code is valid for <strong>15 minutes</strong>. Enter it in your mobile app to complete your verification.</p>
                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'>
                        <p style='color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;'>If you did not request this verification code, please ignore this email.</p>
                    </div>
                ");
        });
    }

    private function ensureCustomer(User $user): void
    {
        if (strcasecmp($user->role?->role_name ?? '', 'Customer') !== 0) {
            throw ValidationException::withMessages([
                'account' => ['This action is only available to customer accounts.'],
            ]);
        }
    }
}
