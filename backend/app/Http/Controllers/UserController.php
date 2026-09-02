<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function index()
    {
        return User::with('role')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'role_id' => 'required|exists:roles,role_id',
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|min:6',
            'status' => 'required|in:active,inactive,blocked',
        ]);

        $user = User::create([
            'role_id' => $request->role_id,
            'full_name' => $request->full_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'status' => $request->status,
        ]);

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
            'phone' => 'nullable|string|max:20',
            'username' => 'nullable|string|max:50|unique:users,username,' . $user->user_id . ',user_id',
            'gender' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|string|max:30',
            'status' => 'nullable|in:active,inactive,blocked',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'password' => 'nullable|min:6',
        ]);

        $data = $request->except(['password', 'photo', 'profile_photo']);

        if ($request->hasFile('photo')) {
            $old = $user->profile_photo_path;
            $path = $request->file('photo')->store('profile-photos', 'public');
            $data['profile_photo_path'] = $path;
            if ($old) {
                Storage::disk('public')->delete($old);
            }
        } elseif ($request->hasFile('profile_photo')) {
            $old = $user->profile_photo_path;
            $path = $request->file('profile_photo')->store('profile-photos', 'public');
            $data['profile_photo_path'] = $path;
            if ($old) {
                Storage::disk('public')->delete($old);
            }
        }

        $user->update($data);

        if (!empty($request->password)) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        return $user->refresh()->load('role');
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
}