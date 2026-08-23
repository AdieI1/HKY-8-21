<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\DeliveryRequestController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\DeliveryTrackingController;
use App\Http\Controllers\IncidentReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SparePartController;
use App\Http\Controllers\VehicleMaintenanceController;
use App\Http\Controllers\DriverLogController;
use App\Http\Controllers\SystemLogController;
use App\Http\Controllers\PermitController;
use App\Http\Controllers\SparePartsUsageController;
use App\Http\Controllers\FuelInventoryController;
use App\Http\Controllers\FuelIssuanceController;


/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

Route::post('/login', [
    AuthController::class,
    'login'
]);

Route::post('/customer/register', [
    CustomerAuthController::class,
    'register'
]);

Route::get('/customer/email/verify/{user}', [
    CustomerAuthController::class,
    'verify'
])->middleware('signed')->name('customer.email.verify');


/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/logout', [
        AuthController::class,
        'logout'
    ]);

    Route::get('/me', [
        AuthController::class,
        'me'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Users / Drivers / Vehicles
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'roles',
        RoleController::class
    );

    Route::apiResource(
        'users',
        UserController::class
    );

    Route::apiResource(
        'drivers',
        DriverController::class
    );

    Route::apiResource(
        'vehicles',
        VehicleController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Delivery Requests
    |--------------------------------------------------------------------------
    */

    Route::get('customer/delivery-requests', [
        DeliveryRequestController::class,
        'myRequests'
    ]);

    Route::post('customer/delivery-requests', [
        DeliveryRequestController::class,
        'storeForCustomer'
    ]);

    Route::post('customer/email/resend', [
        CustomerAuthController::class,
        'resend'
    ]);

    Route::get('customer/email/status', [
        CustomerAuthController::class,
        'status'
    ]);

    Route::patch('customer/profile', [
        CustomerAuthController::class,
        'updateProfile'
    ]);

    Route::apiResource(
        'delivery-requests',
        DeliveryRequestController::class
    );

    Route::post(
        'delivery-requests/create-with-customer',
        [
            DeliveryRequestController::class,
            'storeWithCustomer'
        ]
    );

    Route::post(
        'delivery-requests/{deliveryRequest}/approve',
        [
            DeliveryRequestController::class,
            'approve'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | DRIVER APP - MY DELIVERIES
    |--------------------------------------------------------------------------
    */

    Route::get(
        'my-deliveries',
        [
            DeliveryController::class,
            'myDeliveries'
        ]
    );

    Route::get(
        'my-notifications',
        [
            DeliveryController::class,
            'myNotifications'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Deliveries
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'deliveries',
        DeliveryController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Dispatch Delivery
    |--------------------------------------------------------------------------
    */

    Route::post(
        'deliveries/{delivery}/dispatch',
        [
            DeliveryController::class,
            'dispatch'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Advance Delivery Status
    |--------------------------------------------------------------------------
    */

    Route::post(
        'deliveries/{delivery}/advance-status',
        [
            DeliveryController::class,
            'advanceStatus'
        ]
    );

    Route::post(
        'deliveries/{delivery}/driver-status',
        [
            DeliveryController::class,
            'updateDriverStatus'
        ]
    );

    Route::post(
        'deliveries/{delivery}/checklist',
        [
            DeliveryController::class,
            'saveChecklist'
        ]
    );

    Route::post(
        'deliveries/{delivery}/location',
        [
            DeliveryController::class,
            'updateLocation'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Delivery Tracking
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'delivery-tracking',
        DeliveryTrackingController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Incident Reports
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'incident-reports',
        IncidentReportController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Reviews
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'reviews',
        ReviewController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Spare Parts
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'spare-parts',
        SparePartController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Vehicle Maintenance
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'vehicle-maintenance',
        VehicleMaintenanceController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Driver Logs
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'driver-logs',
        DriverLogController::class
    );


    /*
    |--------------------------------------------------------------------------
    | System Logs
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'system-logs',
        SystemLogController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Permits
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'permits',
        PermitController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Spare Parts Usage
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'spare-parts-usage',
        SparePartsUsageController::class
    );


    /*
    |--------------------------------------------------------------------------
    | Fuel Inventory
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'fuel-inventory',
        FuelInventoryController::class
    );

    Route::post(
        'fuel-inventory/{fuelInventory}/receive',
        [
            FuelInventoryController::class,
            'receive'
        ]
    );

    Route::post(
        'fuel-inventory/{fuelInventory}/issue',
        [
            FuelInventoryController::class,
            'issue'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Fuel Issuances
    |--------------------------------------------------------------------------
    */

    Route::get(
        'fuel-issuances',
        [
            FuelIssuanceController::class,
            'index'
        ]
    );

    Route::get(
        'fuel-issuances/{fuelIssuance}',
        [
            FuelIssuanceController::class,
            'show'
        ]
    );
});