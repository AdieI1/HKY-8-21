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
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $customerRole = Role::where('role_name', 'Customer')->first();

        if (!$customerRole) {
            return response()->json(['message' => 'Customer role is not configured.'], 422);
        }

        $user = User::with('role')->where('email', $validated['email'])->first();
        $created = false;

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
                'username' => $validated['username'],
                'email_verified_at' => now(),
            ]);
        } else {
            $username = $validated['username'];
            $user = User::create([
                'role_id' => $customerRole->role_id,
                'full_name' => $username,
                'email' => $validated['email'],
                'username' => $username,
                'phone' => null,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => now(),
                'status' => 'active',
            ]);
            $created = true;
        }

        $token = $user->createToken('customer_mobile')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'user' => $user->fresh()->load('role'),
            'username' => $user->username,
            'token' => $token,
            'token_type' => 'Bearer',
            'requires_verification' => false,
            'email_sent' => false,
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
            '<h2>Email verified successfully.</h2><p>You can return to the HJY customer app.</p>',
            200,
            ['Content-Type' => 'text/html']
        );
    }

    public function resend(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        if (!$this->trySendingVerificationEmail($user)) {
            return response()->json([
                'message' => 'Verification email could not be sent. Configure Gmail SMTP and try again.'
            ], 503);
        }

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function status(Request $request)
    {
        $user = $request->user();
        $this->ensureCustomer($user);

        return response()->json([
            'verified' => (bool) $user->email_verified_at,
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
            'phone' => 'nullable|string|max:20',
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

    private function trySendingVerificationEmail(User $user): bool
    {
        try {
            $this->sendVerificationEmail($user);
            return true;
        } catch (\Throwable $error) {
            report($error);
            return false;
        }
    }

    private function sendVerificationEmail(User $user): void
    {
        $url = URL::temporarySignedRoute(
            'customer.email.verify',
            now()->addMinutes(60),
            ['user' => $user->user_id]
        );

        Mail::raw(
            "Welcome to HJY Trucking Services.\n\nVerify your email by opening this link:\n{$url}\n\nThis link expires in 60 minutes.",
            function ($message) use ($user) {
                $message->to($user->email)->subject('Verify your HJY customer account');
            }
        );
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
