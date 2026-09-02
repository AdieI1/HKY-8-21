<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->decimal('starting_odometer', 10, 2)->nullable()->after('trip_cost');
            $table->decimal('ending_odometer', 10, 2)->nullable()->after('starting_odometer');
            $table->decimal('starting_fuel', 10, 2)->nullable()->after('ending_odometer');
            $table->decimal('ending_fuel', 10, 2)->nullable()->after('starting_fuel');
            $table->string('fuel_unit', 20)->default('Liters')->nullable()->after('ending_fuel');
        });

        Schema::table('driver_logs', function (Blueprint $table) {
            $table->decimal('starting_odometer', 10, 2)->nullable()->after('ending_location');
            $table->decimal('ending_odometer', 10, 2)->nullable()->after('starting_odometer');
            $table->decimal('starting_fuel', 10, 2)->nullable()->after('ending_odometer');
            $table->decimal('ending_fuel', 10, 2)->nullable()->after('starting_fuel');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'starting_odometer',
                'ending_odometer',
                'starting_fuel',
                'ending_fuel',
                'fuel_unit',
            ]);
        });

        Schema::table('driver_logs', function (Blueprint $table) {
            $table->dropColumn([
                'starting_odometer',
                'ending_odometer',
                'starting_fuel',
                'ending_fuel',
            ]);
        });
    }
};
