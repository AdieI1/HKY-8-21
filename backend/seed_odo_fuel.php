<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Delivery;

$deliveries = Delivery::with('request')->get();
foreach ($deliveries as $d) {
    $dist = $d->request?->distance_km ?? 28.4;
    $baseOdo = 14200 + ($d->delivery_id * 125);
    $d->starting_odometer = $baseOdo;
    $d->ending_odometer = in_array($d->status, ['completed', 'returning_to_hq']) ? ($baseOdo + $dist) : null;
    $d->starting_fuel = 85.0;
    $d->ending_fuel = in_array($d->status, ['completed', 'returning_to_hq']) ? round(85.0 - ($dist * 0.25), 1) : null;
    $d->fuel_unit = 'Liters';
    $d->save();

    echo "DLV{$d->delivery_id}: StartOdo={$d->starting_odometer}, EndOdo={$d->ending_odometer}, StartFuel={$d->starting_fuel}, EndFuel={$d->ending_fuel}\n";
}

echo "Successfully seeded starting/ending odometer and fuel values!\n";
