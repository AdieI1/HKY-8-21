<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
            'full_name' => 'required',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable',
            'password' => 'required|min:6',
            'status' => 'required'
        ]);

        $user = User::create([
            'role_id' => $request->role_id,
            'full_name' => $request->full_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'status' => $request->status
        ]);

        return $user;
    }

    public function show(User $user)
    {
        return $user->load('role');
    }

    public function update(Request $request, User $user)
    {
        $user->update($request->except('password'));

        if ($request->password) {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        return $user;
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.'
        ]);
    }
}