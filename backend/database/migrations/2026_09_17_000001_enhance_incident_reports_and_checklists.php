<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Modify incident_reports
        Schema::table('incident_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('incident_reports', 'location_address')) {
                $table->string('location_address', 255)->nullable()->after('description');
            }
            if (!Schema::hasColumn('incident_reports', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('location_address');
            }
            if (!Schema::hasColumn('incident_reports', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (!Schema::hasColumn('incident_reports', 'photos')) {
                $table->json('photos')->nullable()->after('photo_proof');
            }
        });

        // Widen incident_type to accommodate all UI issue types (breakdown, flat tire, etc.)
        try {
            DB::statement("ALTER TABLE incident_reports MODIFY COLUMN incident_type VARCHAR(50) NOT NULL DEFAULT 'other'");
        } catch (\Throwable $e) {
            // In case driver doesn't support raw alter, continue
        }

        // 2. Modify delivery_checklists to track inspecting staff
        Schema::table('delivery_checklists', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_checklists', 'inspected_by')) {
                $table->foreignId('inspected_by')
                    ->nullable()
                    ->after('items')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
            if (!Schema::hasColumn('delivery_checklists', 'inspector_name')) {
                $table->string('inspector_name', 255)->nullable()->after('inspected_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (Schema::hasColumn('incident_reports', 'photos')) {
                $table->dropColumn('photos');
            }
            if (Schema::hasColumn('incident_reports', 'longitude')) {
                $table->dropColumn('longitude');
            }
            if (Schema::hasColumn('incident_reports', 'latitude')) {
                $table->dropColumn('latitude');
            }
            if (Schema::hasColumn('incident_reports', 'location_address')) {
                $table->dropColumn('location_address');
            }
        });

        Schema::table('delivery_checklists', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_checklists', 'inspected_by')) {
                $table->dropForeign(['inspected_by']);
                $table->dropColumn('inspected_by');
            }
            if (Schema::hasColumn('delivery_checklists', 'inspector_name')) {
                $table->dropColumn('inspector_name');
            }
        });
    }
};
