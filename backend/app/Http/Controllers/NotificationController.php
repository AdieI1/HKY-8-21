<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\FuelInventory;
use App\Models\SparePart;
use App\Models\VehicleMaintenance;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get system notifications for admin/staff
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // If table is completely empty, populate initial historical activity
        if (AppNotification::count() === 0) {
            $this->seedInitialNotifications();
        }

        $query = AppNotification::where(function ($q) use ($user) {
            $q->whereNull('user_id');
            if ($user) {
                $q->orWhere('user_id', $user->user_id);
            }
        })->orderByDesc('created_at');

        $notifications = $query->take(30)->get()->map(function ($n) {
            return [
                'id' => $n->notification_id,
                'type' => $n->type,
                'title' => $n->title,
                'message' => $n->message,
                'link' => $n->link ?: '/overview',
                'time' => $n->created_at ? $n->created_at->toIso8601String() : now()->toIso8601String(),
                'icon' => $this->getIconForType($n->type),
                'color' => $this->getColorForType($n->type),
                'is_read' => (bool)$n->is_read,
            ];
        });

        $unreadCount = AppNotification::where(function ($q) use ($user) {
            $q->whereNull('user_id');
            if ($user) {
                $q->orWhere('user_id', $user->user_id);
            }
        })->where('is_read', false)->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $numId = (int) preg_replace('/\D/', '', (string)$id);
        if ($numId > 0) {
            AppNotification::where('notification_id', $numId)->update(['is_read' => true]);
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
            $q->whereNull('user_id');
            if ($user) {
                $q->orWhere('user_id', $user->user_id);
            }
        })->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * Seed initial real activity records if table is empty
     */
    private function seedInitialNotifications(): void
    {
        try {
            // 1. Pending Delivery Requests
            $pendingRequests = DeliveryRequest::with('customer')
                ->where('status', 'pending')
                ->orderByDesc('request_id')
                ->take(3)
                ->get();

            foreach ($pendingRequests as $req) {
                $customerName = $req->customer?->full_name ?: 'Customer';
                AppNotification::create([
                    'type' => 'request',
                    'title' => 'New Delivery Request',
                    'message' => "{$customerName} submitted a new delivery request (" . ($req->cargo_type ?: 'Cargo') . ").",
                    'link' => '/requests',
                    'is_read' => false,
                    'created_at' => $req->created_at ?: now(),
                ]);
            }

            // 2. Active Deliveries
            $activeDeliveries = Delivery::with(['driver.user', 'vehicle'])
                ->whereIn('status', ['assigned', 'accepted', 'in_transit', 'out_for_delivery'])
                ->orderByDesc('delivery_id')
                ->take(3)
                ->get();

            foreach ($activeDeliveries as $del) {
                $driverName = $del->driver?->user?->full_name ?: 'Driver';
                $plate = $del->vehicle?->plate_number ?: 'Truck';
                AppNotification::create([
                    'type' => 'dispatch',
                    'title' => 'Delivery in Progress',
                    'message' => "Delivery #DEL" . str_pad($del->delivery_id, 4, '0', STR_PAD_LEFT) . " assigned to {$driverName} ({$plate}).",
                    'link' => '/delivery',
                    'is_read' => false,
                    'created_at' => $del->created_at ?: now(),
                ]);
            }

            // 3. Maintenance
            $maintenances = VehicleMaintenance::with('vehicle')
                ->orderByDesc('maintenance_id')
                ->take(2)
                ->get();

            foreach ($maintenances as $m) {
                $vModel = $m->vehicle?->model ?: 'Vehicle';
                AppNotification::create([
                    'type' => 'maintenance',
                    'title' => 'Scheduled Maintenance',
                    'message' => "{$m->maintenance_type} scheduled for {$vModel} on {$m->maintenance_date}.",
                    'link' => '/vehicles',
                    'is_read' => false,
                    'created_at' => $m->created_at ?: now(),
                ]);
            }

            // 4. Low stock parts
            $lowParts = SparePart::whereColumn('quantity_in_stock', '<=', 'reorder_level')
                ->orderBy('quantity_in_stock')
                ->take(2)
                ->get();

            foreach ($lowParts as $part) {
                $isOut = $part->quantity_in_stock <= 0;
                AppNotification::create([
                    'type' => 'inventory_alert',
                    'title' => $isOut ? 'Part Out of Stock' : 'Low Stock Warning',
                    'message' => "{$part->part_name} is {$part->status} ({$part->quantity_in_stock} {$part->unit} left).",
                    'link' => '/parts-inventory',
                    'is_read' => false,
                    'created_at' => $part->updated_at ?: now(),
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Initial notification seed error: ' . $e->getMessage());
        }
    }

    private function getIconForType(?string $type): string
    {
        return match ($type) {
            'request' => 'fas fa-clipboard-list',
            'dispatch', 'delivery' => 'fas fa-truck-moving',
            'driver' => 'fas fa-id-card',
            'vehicle' => 'fas fa-truck',
            'maintenance' => 'fas fa-tools',
            'fuel_alert', 'fuel' => 'fas fa-gas-pump',
            'inventory_alert', 'parts' => 'fas fa-boxes',
            'incident' => 'fas fa-exclamation-triangle',
            default => 'fas fa-bell',
        };
    }

    private function getColorForType(?string $type): string
    {
        return match ($type) {
            'request' => '#3b82f6',
            'dispatch', 'delivery' => '#10b981',
            'driver' => '#6366f1',
            'vehicle' => '#0ea5e9',
            'maintenance' => '#8b5cf6',
            'fuel_alert', 'fuel' => '#f97316',
            'inventory_alert', 'parts' => '#f59e0b',
            'incident' => '#ef4444',
            default => '#3b82f6',
        };
    }
}
