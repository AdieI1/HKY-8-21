<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Log in a user and issue a Sanctum API token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'nullable|string|required_without:email',
            'email' => 'nullable|email|required_without:login',
            'password' => 'required|string',
        ]);

        $identifier = $request->input('login', $request->email);
        $user = User::where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ["This account is {$user->status} and cannot log in."],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->load('role');

        return response()->json([
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
            'requires_verification' =>
                strcasecmp($user->role?->role_name ?? '', 'Customer') === 0 &&
                !$user->email_verified_at,
        ]);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request)
    {
        return $request->user()->load('role');
    }

    /**
     * Revoke the token used for the current request (log out).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}