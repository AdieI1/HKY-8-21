<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Models\IncidentReport;
use App\Models\SystemLog;
use App\Models\SparePart;
use App\Models\FuelInventory;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Single consolidated, high-speed dashboard overview endpoint
     */
    public function overview(Request $request)
    {
        $deliveries = Delivery::with([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
        ])
        ->orderByDesc('delivery_id')
        ->take(60)
        ->get();

        $requests = DeliveryRequest::with('customer')
            ->orderByDesc('request_id')
            ->take(40)
            ->get();

        $drivers = Driver::with('user')->get();
        $vehicles = Vehicle::all();

        $maintenances = VehicleMaintenance::with('vehicle')
            ->orderByDesc('maintenance_id')
            ->take(25)
            ->get();

        $incidents = IncidentReport::with(['delivery.driver.user', 'delivery.request', 'reporter'])
            ->orderByDesc('incident_id')
            ->take(20)
            ->get();

        $systemLogs = SystemLog::with('user')
            ->orderByDesc('log_id')
            ->take(20)
            ->get();

        $spareParts = SparePart::all();
        $fuelInventories = FuelInventory::all();
        $users = User::with('role')->get();
        $roles = Role::all();

        return response()->json([
            'deliveries' => $deliveries,
            'requests' => $requests,
            'drivers' => $drivers,
            'vehicles' => $vehicles,
            'maintenances' => $maintenances,
            'incidents' => $incidents,
            'system_logs' => $systemLogs,
            'spare_parts' => $spareParts,
            'fuel_inventories' => $fuelInventories,
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    /**
     * Single consolidated, high-speed dispatch management overview endpoint
     */
    public function dispatchOverview(Request $request)
    {
        $deliveries = Delivery::with([
            'request.customer',
            'driver.user',
            'vehicle',
            'assignedBy',
        ])
        ->orderByDesc('delivery_id')
        ->get();

        $drivers = Driver::with('user')->get();

        $vehicles = Vehicle::with([
            'deliveries' => function ($q) {
                $q->orderByDesc('delivery_id')->take(10);
            }
        ])->get();

        $incidents = IncidentReport::with(['delivery.driver.user', 'delivery.request', 'reporter'])
            ->orderByDesc('incident_id')
            ->take(30)
            ->get();

        $fuelInventories = FuelInventory::all();

        return response()->json([
            'deliveries' => $deliveries,
            'drivers' => $drivers,
            'vehicles' => $vehicles,
            'incidents' => $incidents,
            'fuel_inventory' => $fuelInventories,
        ]);
    }
}
