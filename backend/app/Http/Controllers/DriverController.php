<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DriverController extends Controller
{
    public function index()
    {
        return Driver::with('user')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:50|unique:users,username',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|min:6',

            'license_number' => 'nullable|string|max:50',
            'license_type' => 'nullable|string|max:50',
            'restriction_code' => 'nullable|string|max:50',
            'license_date_issued' => 'nullable|date',
            'license_expiry_date' => 'nullable|date',
            'authorized_by' => 'nullable|string|max:100',

            'availability_status' => 'nullable|in:available,busy,offline',

            'experience_years' => 'nullable|integer|min:0',
            'health_condition' => 'nullable|string|max:255',
            'birthdate' => 'nullable|date',
            'nationality' => 'nullable|string|max:50',
            'last_medical_check' => 'nullable|date',
            'prescriptions' => 'nullable|string',
            'existing_conditions' => 'nullable|string',

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

        $driver = DB::transaction(function () use (
            $request,
            $driverRole
        ) {
            $user = User::create([
                'role_id' => $driverRole?->role_id,
                'full_name' => $request->full_name,
                'email' => $request->email,
                'username' => $request->username,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
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

                'date_hired' => $request->date_hired,
                'hired_by' => $request->hired_by,
                'contract_start' => $request->contract_start,
                'contract_end' => $request->contract_end,

                'status' => 'active',
            ]);
        });

        return $driver->load('user');
    }

    public function show(Driver $driver)
    {
        return $driver->load('user');
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

            'availability_status' =>
                'nullable|in:available,busy,offline',

            'status' =>
                'nullable|in:active,inactive',
        ]);

        DB::transaction(function () use ($request, $driver) {

            $driver->update(
                $request->only([
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
                    'date_hired',
                    'hired_by',
                    'contract_start',
                    'contract_end',
                    'status',
                ])
            );

            if (
                $request->filled('full_name') ||
                $request->filled('email') ||
                $request->filled('username') ||
                $request->filled('phone') ||
                $request->filled('password')
            ) {
                $userPayload = $request->only([
                    'full_name',
                    'email',
                    'username',
                    'phone',
                ]);

                if ($request->filled('password')) {
                    $userPayload['password'] =
                        Hash::make($request->password);
                }

                $driver->user()->update($userPayload);
            }
        });

        return $driver->load('user');
    }

    public function destroy(Driver $driver)
    {
        $driver->delete();

        return response()->json([
            'message' => 'Driver deleted successfully.'
        ]);
    }
}