<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'is_relief')) {
                $table->boolean('is_relief')->default(false)->after('remarks');
            }
            if (!Schema::hasColumn('deliveries', 'relief_origin_address')) {
                $table->string('relief_origin_address', 255)->nullable()->after('is_relief');
            }
            if (!Schema::hasColumn('deliveries', 'relief_origin_lat')) {
                $table->decimal('relief_origin_lat', 10, 7)->nullable()->after('relief_origin_address');
            }
            if (!Schema::hasColumn('deliveries', 'relief_origin_lng')) {
                $table->decimal('relief_origin_lng', 10, 7)->nullable()->after('relief_origin_lat');
            }
            if (!Schema::hasColumn('deliveries', 'stranded_driver_id')) {
                $table->unsignedBigInteger('stranded_driver_id')->nullable()->after('relief_origin_lng');
            }
            if (!Schema::hasColumn('deliveries', 'stranded_vehicle_id')) {
                $table->unsignedBigInteger('stranded_vehicle_id')->nullable()->after('stranded_driver_id');
            }
            if (!Schema::hasColumn('deliveries', 'relief_incident_id')) {
                $table->unsignedBigInteger('relief_incident_id')->nullable()->after('stranded_vehicle_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $cols = [
                'is_relief',
                'relief_origin_address',
                'relief_origin_lat',
                'relief_origin_lng',
                'stranded_driver_id',
                'stranded_vehicle_id',
                'relief_incident_id'
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('deliveries', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
