<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Driver;
use App\Models\DriverLeave;
use Illuminate\Http\Request;

class DriverLeaveController extends Controller
{
    public function index(Request $request)
    {
        Driver::syncAllStatuses();

        $user = $request->user()?->load(['role', 'driver']);
        $roleName = strtolower($user?->role?->role_name ?? '');

        $query = DriverLeave::with(['driver.user', 'user', 'reviewer'])
            ->orderByDesc('leave_id');

        if ($roleName === 'driver') {
            $driverId = $user->driver?->driver_id;
            if (!$driverId) {
                return response()->json([]);
            }
            $query->where('driver_id', $driverId);
        } elseif ($request->filled('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $user = $request->user()->load(['role', 'driver']);
        $roleName = strtolower($user->role?->role_name ?? '');
        $isDriver = $roleName === 'driver';

        $validated = $request->validate([
            'driver_id' => ($isDriver ? 'nullable' : 'required') . '|exists:drivers,driver_id',
            'leave_type' => 'required|in:sick_leave,emergency_absence,day_off,vacation',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'reason' => 'required|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240',
            'auto_approve' => 'nullable|boolean',
        ], [
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
        ]);

        $driver = $isDriver
            ? $user->driver
            : Driver::with('user')->findOrFail($validated['driver_id']);

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'] ?? $startDate;
        $today = now()->toDateString();

        // Prevent leave overlap if driver is currently active in a delivery covering today
        if ($startDate <= $today && $endDate >= $today && $driver->hasActiveDelivery()) {
            return response()->json([
                'message' => 'Cannot file leave for today while on an active delivery. Complete or report the trip issue first.',
            ], 422);
        }

        // Prevent duplicate overlapping pending/approved leave
        $overlap = DriverLeave::where('driver_id', $driver->driver_id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $endDate)
            ->whereDate('end_date', '>=', $startDate)
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'An active or pending leave request already covers these dates.',
            ], 422);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('drivers/leaves', 'public');
        }

        $autoApprove = !$isDriver && $request->boolean('auto_approve', true);

        $leave = DriverLeave::create([
            'driver_id' => $driver->driver_id,
            'user_id' => $driver->user_id,
            'leave_type' => $validated['leave_type'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'reason' => trim($validated['reason']),
            'attachment_path' => $attachmentPath,
            'status' => $autoApprove ? 'approved' : 'pending',
            'reviewed_by' => $autoApprove ? $user->user_id : null,
            'reviewed_at' => $autoApprove ? now() : null,
            'review_notes' => $autoApprove ? 'Logged directly by staff/admin.' : null,
        ]);

        $driver->syncLeaveAndDutyStatus();

        $driverName = $driver->user?->full_name ?: 'Driver';
        $typeLabel = ucwords(str_replace('_', ' ', $validated['leave_type']));
        $dateText = $startDate === $endDate ? $startDate : "{$startDate} to {$endDate}";
        $isUrgentToday = in_array($validated['leave_type'], ['sick_leave', 'emergency_absence'], true)
            && $startDate <= $today && $endDate >= $today;

        if ($autoApprove) {
            AppNotification::notify(
                'driver',
                "Driver Leave Recorded ({$typeLabel})",
                "{$driverName} was marked on {$typeLabel} ({$dateText}).",
                '/drivers'
            );
        } else {
            AppNotification::notify(
                'driver_leave',
                "Driver Leave Request: {$driverName}",
                "{$driverName} filed a {$typeLabel} ({$dateText})" . ($isUrgentToday ? ' — driver locked from Dispatch until reviewed.' : '.'),
                '/drivers'
            );
        }

        return response()->json([
            'message' => $autoApprove
                ? "Leave approved and {$driverName} updated."
                : ($isUrgentToday
                    ? 'Leave request submitted! You are marked unavailable for dispatch until staff reviews your request.'
                    : 'Leave request submitted for staff approval.'),
            'leave' => $leave->fresh()->load(['driver.user', 'user', 'reviewer']),
            'driver' => $driver->fresh(),
        ], 201);
    }

    public function approve(Request $request, DriverLeave $driverLeave)
    {
        if ($driverLeave->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending leave requests can be approved.',
            ], 422);
        }

        $driver = $driverLeave->driver;
        if ($driver && $driverLeave->start_date?->toDateString() <= now()->toDateString()
            && $driverLeave->end_date?->toDateString() >= now()->toDateString()
            && $driver->hasActiveDelivery()) {
            return response()->json([
                'message' => 'Driver is currently on an active delivery today and cannot be switched to On Leave mid-trip.',
            ], 422);
        }

        $driverLeave->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()?->user_id,
            'reviewed_at' => now(),
            'review_notes' => trim((string) $request->input('review_notes', '')) ?: null,
        ]);

        if ($driver) {
            $driver->syncLeaveAndDutyStatus();
        }

        $driverName = $driver?->user?->full_name ?: 'Driver';
        $typeLabel = ucwords(str_replace('_', ' ', $driverLeave->leave_type));
        AppNotification::notify(
            'driver_leave',
            "Leave Approved ({$typeLabel})",
            "Your {$typeLabel} ({$driverLeave->start_date?->toDateString()} to {$driverLeave->end_date?->toDateString()}) was approved.",
            '/drivers',
            $driverLeave->user_id
        );

        return response()->json([
            'message' => "{$driverName}'s {$typeLabel} approved.",
            'leave' => $driverLeave->fresh()->load(['driver.user', 'user', 'reviewer']),
        ]);
    }

    public function reject(Request $request, DriverLeave $driverLeave)
    {
        if ($driverLeave->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending leave requests can be rejected.',
            ], 422);
        }

        $notes = trim((string) $request->input('review_notes', ''));
        $driverLeave->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()?->user_id,
            'reviewed_at' => now(),
            'review_notes' => $notes ?: 'Declined by staff/admin.',
        ]);

        if ($driverLeave->driver) {
            $driverLeave->driver->syncLeaveAndDutyStatus();
        }

        $typeLabel = ucwords(str_replace('_', ' ', $driverLeave->leave_type));
        AppNotification::notify(
            'driver_leave',
            "Leave Request Declined ({$typeLabel})",
            "Your {$typeLabel} request was declined" . ($notes ? ": {$notes}" : '.'),
            '/drivers',
            $driverLeave->user_id
        );

        return response()->json([
            'message' => 'Leave request rejected.',
            'leave' => $driverLeave->fresh()->load(['driver.user', 'user', 'reviewer']),
        ]);
    }

    public function cancel(Request $request, DriverLeave $driverLeave)
    {
        $user = $request->user()?->load(['role', 'driver']);
        $roleName = strtolower($user?->role?->role_name ?? '');

        if ($roleName === 'driver' && (int) $driverLeave->driver_id !== (int) ($user->driver?->driver_id ?? 0)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($driverLeave->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending leave requests can be cancelled.',
            ], 422);
        }

        $driverLeave->update(['status' => 'cancelled']);

        if ($driverLeave->driver) {
            $driverLeave->driver->syncLeaveAndDutyStatus();
        }

        return response()->json([
            'message' => 'Leave request cancelled.',
            'leave' => $driverLeave->fresh()->load(['driver.user', 'user', 'reviewer']),
        ]);
    }
}
