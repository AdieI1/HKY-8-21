<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'color')) {
                $table->string('color', 50)->nullable()->after('vehicle_type');
            }
            if (! Schema::hasColumn('vehicles', 'condition')) {
                $table->string('condition', 30)->nullable()->after('status');
            }
            if (! Schema::hasColumn('vehicles', 'registration_valid_from')) {
                $table->date('registration_valid_from')->nullable()->after('condition');
            }
            if (! Schema::hasColumn('vehicles', 'registration_valid_until')) {
                $table->date('registration_valid_until')->nullable()->after('registration_valid_from');
            }
            if (! Schema::hasColumn('vehicles', 'last_maintenance_date')) {
                $table->date('last_maintenance_date')->nullable()->after('registration_valid_until');
            }
            if (! Schema::hasColumn('vehicles', 'next_maintenance_date')) {
                $table->date('next_maintenance_date')->nullable()->after('last_maintenance_date');
            }
            if (! Schema::hasColumn('vehicles', 'photo')) {
                $table->string('photo', 255)->nullable()->after('next_maintenance_date');
            }
        });

        // Expand status enum to include broken/decommissioned if not already done.
        DB::statement("ALTER TABLE vehicles MODIFY status ENUM('available','in_use','maintenance','broken','decommissioned') DEFAULT 'available'");
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'color',
                'condition',
                'registration_valid_from',
                'registration_valid_until',
                'last_maintenance_date',
                'next_maintenance_date',
                'photo',
            ]);
        });
    }
};