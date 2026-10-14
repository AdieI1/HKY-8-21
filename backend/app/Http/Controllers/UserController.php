<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AppNotification;
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
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'password' => 'required|min:6',
            'status' => 'required|in:active,inactive,blocked',
            'sss_number' => 'nullable|string|max:50',
            'philhealth_number' => 'nullable|string|max:50',
            'pagibig_number' => 'nullable|string|max:50',
            'deductible_taxes' => 'nullable|string|max:100',
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
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
            'username' => 'nullable|string|max:50|unique:users,username,' . $user->user_id . ',user_id',
            'gender' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|string|max:30',
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

        return $user->refresh()->load(['role', 'driver']);
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
}