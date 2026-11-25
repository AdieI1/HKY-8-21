<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'fuel_allowance')) {
                $table->decimal('fuel_allowance', 10, 2)->default(0)->nullable()->after('fuel_issued');
            }
        });

        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'fuel_level')) {
                $table->decimal('fuel_level', 10, 2)->nullable()->after('odometer_reading');
            }
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            if (Schema::hasColumn('deliveries', 'fuel_allowance')) {
                $table->dropColumn('fuel_allowance');
            }
        });

        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'fuel_level')) {
                $table->dropColumn('fuel_level');
            }
        });
    }
};
