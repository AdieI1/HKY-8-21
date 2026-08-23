<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE deliveries MODIFY COLUMN status ENUM('assigned', 'accepted', 'rejected', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo', 'returning_to_hq', 'completed') DEFAULT 'assigned'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE deliveries MODIFY COLUMN status ENUM('assigned', 'accepted', 'rejected', 'arrived_pickup', 'out_for_delivery', 'arrived_dropoff', 'returning_to_hq', 'completed') DEFAULT 'assigned'");
        }
    }
};
