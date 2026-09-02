<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\FuelInventory;
use App\Models\SparePart;
use App\Models\VehicleMaintenance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * Get system notifications for admin/staff
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $notifications = [];

        // 1. Pending Delivery Requests
        $pendingRequests = DeliveryRequest::with('customer')
            ->where('status', 'pending')
            ->orderByDesc('request_id')
            ->take(5)
            ->get();

        foreach ($pendingRequests as $req) {
            $customerName = $req->customer?->full_name ?: 'Customer';
            $notifications[] = [
                'id' => 'req_' . $req->request_id,
                'type' => 'request',
                'title' => 'New Delivery Request',
                'message' => "{$customerName} submitted a new delivery request (" . ($req->cargo_type ?: 'Cargo') . ").",
                'link' => '/requests',
                'time' => $req->created_at ? $req->created_at->toIso8601String() : now()->toIso8601String(),
                'icon' => 'fas fa-clipboard-list',
                'color' => '#3b82f6',
                'is_read' => false,
            ];
        }

        // 2. Low stock parts
        $lowParts = SparePart::whereColumn('quantity_in_stock', '<=', 'reorder_level')
            ->orderBy('quantity_in_stock')
            ->take(5)
            ->get();

        foreach ($lowParts as $part) {
            $isOut = $part->quantity_in_stock <= 0;
            $notifications[] = [
                'id' => 'part_' . $part->part_id,
                'type' => 'inventory_alert',
                'title' => $isOut ? 'Part Out of Stock' : 'Low Stock Warning',
                'message' => "{$part->part_name} is {$part->status} ({$part->quantity_in_stock} {$part->unit} left).",
                'link' => '/parts-inventory',
                'time' => $part->updated_at ? $part->updated_at->toIso8601String() : now()->toIso8601String(),
                'icon' => 'fas fa-exclamation-triangle',
                'color' => $isOut ? '#ef4444' : '#f59e0b',
                'is_read' => false,
            ];
        }

        // 3. Low stock fuel
        $lowFuel = FuelInventory::whereColumn('current_stock', '<=', 'reorder_level')->get();
        foreach ($lowFuel as $fuel) {
            $notifications[] = [
                'id' => 'fuel_' . $fuel->fuel_id,
                'type' => 'fuel_alert',
                'title' => 'Low Fuel Stock',
                'message' => "{$fuel->fuel_type} level is low ({$fuel->current_stock} {$fuel->unit} remaining).",
                'link' => '/fuel-inventory',
                'time' => $fuel->updated_at ? $fuel->updated_at->toIso8601String() : now()->toIso8601String(),
                'icon' => 'fas fa-gas-pump',
                'color' => '#f97316',
                'is_read' => false,
            ];
        }

        // 4. Scheduled Maintenance
        $upcomingMaintenance = VehicleMaintenance::with('vehicle')
            ->where('status', 'Scheduled')
            ->orderBy('maintenance_date')
            ->take(5)
            ->get();

        foreach ($upcomingMaintenance as $m) {
            $vModel = $m->vehicle?->model ?: 'Truck';
            $vPlate = $m->vehicle?->plate_number ? " ({$m->vehicle->plate_number})" : '';
            $notifications[] = [
                'id' => 'maint_' . $m->maintenance_id,
                'type' => 'maintenance',
                'title' => 'Scheduled Maintenance',
                'message' => "{$m->maintenance_type} scheduled for {$vModel}{$vPlate} on {$m->maintenance_date}.",
                'link' => '/vehicles',
                'time' => $m->created_at ? $m->created_at->toIso8601String() : now()->toIso8601String(),
                'icon' => 'fas fa-tools',
                'color' => '#8b5cf6',
                'is_read' => false,
            ];
        }

        // 5. Database stored notifications
        $customNotifications = AppNotification::where(function ($q) use ($user) {
            $q->whereNull('user_id')->orWhere('user_id', $user?->user_id);
        })
            ->orderByDesc('created_at')
            ->take(15)
            ->get();

        foreach ($customNotifications as $cn) {
            $notifications[] = [
                'id' => 'db_' . $cn->notification_id,
                'type' => $cn->type,
                'title' => $cn->title,
                'message' => $cn->message,
                'link' => $cn->link,
                'time' => $cn->created_at ? $cn->created_at->toIso8601String() : now()->toIso8601String(),
                'icon' => 'fas fa-bell',
                'color' => '#3b82f6',
                'is_read' => $cn->is_read,
            ];
        }

        // Sort all notifications by time descending
        usort($notifications, function ($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });

        return response()->json([
            'unread_count' => count(array_filter($notifications, fn($n) => !$n['is_read'])),
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        if (str_starts_with($id, 'db_')) {
            $dbId = (int) substr($id, 3);
            AppNotification::where('notification_id', $dbId)->update(['is_read' => true]);
        }

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        AppNotification::where(function ($q) use ($user) {
            $q->whereNull('user_id')->orWhere('user_id', $user?->user_id);
        })->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
