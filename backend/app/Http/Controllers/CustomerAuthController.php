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
            'phone' => 'required|string|max:20',
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
                'phone' => $validated['phone'],
                'email_verified_at' => now(),
            ]);
        } else {
            $username = $this->uniqueUsername($validated['email']);
            $user = User::create([
                'role_id' => $customerRole->role_id,
                'full_name' => $username,
                'email' => $validated['email'],
                'username' => $username,
                'phone' => $validated['phone'],
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
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'phone' => 'required|string|max:20',
        ]);

        $user->update([
            'full_name' => trim($validated['first_name'].' '.$validated['last_name']),
            'phone' => $validated['phone'],
        ]);

        return response()->json([
            'message' => 'Account setup completed.',
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
