<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'engine_number')) {
                $table->string('engine_number', 50)->nullable()->after('plate_number');
            }
            if (!Schema::hasColumn('vehicles', 'chassis_number')) {
                $table->string('chassis_number', 50)->nullable()->after('engine_number');
            }
            if (!Schema::hasColumn('vehicles', 'classification')) {
                $table->string('classification', 50)->nullable()->after('vehicle_type');
            }
            if (!Schema::hasColumn('vehicles', 'vehicle_category')) {
                $table->string('vehicle_category', 20)->nullable()->after('classification');
            }
            if (!Schema::hasColumn('vehicles', 'body_type')) {
                $table->string('body_type', 80)->nullable()->after('vehicle_category');
            }
            if (!Schema::hasColumn('vehicles', 'passenger_capacity')) {
                $table->unsignedSmallInteger('passenger_capacity')->nullable()->after('capacity');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $cols = array_filter(
                ['engine_number', 'chassis_number', 'classification', 'vehicle_category', 'body_type', 'passenger_capacity'],
                fn ($col) => Schema::hasColumn('vehicles', $col)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
