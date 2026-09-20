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
        Schema::table('incident_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('incident_reports', 'police_report_no')) {
                $table->string('police_report_no', 100)->nullable()->after('resolution_notes');
            }
            if (!Schema::hasColumn('incident_reports', 'vehicle_towed_to')) {
                $table->string('vehicle_towed_to', 255)->nullable()->after('police_report_no');
            }
            if (!Schema::hasColumn('incident_reports', 'cargo_condition')) {
                $table->string('cargo_condition', 50)->nullable()->after('vehicle_towed_to');
            }
            if (!Schema::hasColumn('incident_reports', 'resolved_by')) {
                $table->foreignId('resolved_by')
                    ->nullable()
                    ->after('cargo_condition')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (Schema::hasColumn('incident_reports', 'resolved_by')) {
                $table->dropForeign(['resolved_by']);
                $table->dropColumn('resolved_by');
            }
            if (Schema::hasColumn('incident_reports', 'cargo_condition')) {
                $table->dropColumn('cargo_condition');
            }
            if (Schema::hasColumn('incident_reports', 'vehicle_towed_to')) {
                $table->dropColumn('vehicle_towed_to');
            }
            if (Schema::hasColumn('incident_reports', 'police_report_no')) {
                $table->dropColumn('police_report_no');
            }
        });
    }
};
