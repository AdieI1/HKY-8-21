<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('deliveries')) {
            Schema::table('deliveries', function (Blueprint $table) {
                $table->index('status', 'idx_deliveries_status');
                $table->index(['status', 'created_at'], 'idx_deliveries_status_created_at');
            });
        }

        if (Schema::hasTable('delivery_requests')) {
            Schema::table('delivery_requests', function (Blueprint $table) {
                $table->index('status', 'idx_delivery_requests_status');
                $table->index(['status', 'created_at'], 'idx_delivery_requests_status_created_at');
            });
        }

        if (Schema::hasTable('app_notifications')) {
            Schema::table('app_notifications', function (Blueprint $table) {
                $table->index(['user_id', 'created_at'], 'idx_notifications_user_created_at');
            });
        }

        if (Schema::hasTable('incident_reports')) {
            Schema::table('incident_reports', function (Blueprint $table) {
                $table->index('status', 'idx_incident_reports_status');
            });
        }

        if (Schema::hasTable('vehicle_maintenance')) {
            Schema::table('vehicle_maintenance', function (Blueprint $table) {
                $table->index('status', 'idx_vehicle_maintenance_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('deliveries')) {
            Schema::table('deliveries', function (Blueprint $table) {
                $table->dropIndex('idx_deliveries_status');
                $table->dropIndex('idx_deliveries_status_created_at');
            });
        }

        if (Schema::hasTable('delivery_requests')) {
            Schema::table('delivery_requests', function (Blueprint $table) {
                $table->dropIndex('idx_delivery_requests_status');
                $table->dropIndex('idx_delivery_requests_status_created_at');
            });
        }

        if (Schema::hasTable('app_notifications')) {
            Schema::table('app_notifications', function (Blueprint $table) {
                $table->dropIndex('idx_notifications_user_created_at');
            });
        }

        if (Schema::hasTable('incident_reports')) {
            Schema::table('incident_reports', function (Blueprint $table) {
                $table->dropIndex('idx_incident_reports_status');
            });
        }

        if (Schema::hasTable('vehicle_maintenance')) {
            Schema::table('vehicle_maintenance', function (Blueprint $table) {
                $table->dropIndex('idx_vehicle_maintenance_status');
            });
        }
    }
};
