<?php

namespace App\Http\Controllers;

use App\Models\Driver;
use App\Models\Role;
use App\Models\User;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DriverController extends Controller
{
    public function index()
    {
        // Auto-sync: if driver is marked busy but has no active ongoing deliveries, reset to available
        Driver::where('availability_status', 'busy')
            ->whereDoesntHave('deliveries', function ($q) {
                $q->whereNotIn('status', ['completed', 'rejected']);
            })
            ->update(['availability_status' => 'available']);

        return Driver::with(['user', 'deliveries:delivery_id,driver_id,status'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:50|unique:users,username',
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'password' => 'required|min:6',
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
            'birthdate' => 'nullable|date',
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

        $driver = DB::transaction(function () use (
            $request,
            $driverRole,
            $photoPath,
            $docPaths
        ) {
            $user = User::create([
                'role_id' => $driverRole?->role_id,
                'full_name' => $request->full_name,
                'email' => $request->email,
                'username' => $request->username,
                'phone' => $request->phone,
                'profile_photo_path' => $photoPath,
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

        $driverName = $driver->user?->full_name ?: 'Driver';
        AppNotification::notify('driver', 'New Driver Added', "Driver {$driverName} has been registered.", '/drivers');

        return $driver->load('user');
    }

    public function show(Driver $driver)
    {
        return $driver->load(['user', 'deliveries.vehicle', 'permits', 'driverLogs']);
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

        DB::transaction(function () use ($request, $driver) {
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

        $driverName = $driver->user?->full_name ?: 'Driver';
        AppNotification::notify('driver', 'Driver Updated', "Driver {$driverName} profile was updated.", '/drivers');

        return $driver->fresh()->load('user');
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