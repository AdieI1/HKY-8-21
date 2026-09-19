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
            if (!Schema::hasColumn('incident_reports', 'incident_types')) {
                $table->json('incident_types')->nullable()->after('incident_type');
            }
            if (!Schema::hasColumn('incident_reports', 'recommended_action')) {
                $table->string('recommended_action', 100)->nullable()->after('severity');
            }
            if (!Schema::hasColumn('incident_reports', 'recommendation_title')) {
                $table->string('recommendation_title', 150)->nullable()->after('recommended_action');
            }
            if (!Schema::hasColumn('incident_reports', 'recommendation_notes')) {
                $table->text('recommendation_notes')->nullable()->after('recommendation_title');
            }
            if (!Schema::hasColumn('incident_reports', 'resolution_action')) {
                $table->string('resolution_action', 100)->nullable()->after('status');
            }
            if (!Schema::hasColumn('incident_reports', 'resolution_notes')) {
                $table->text('resolution_notes')->nullable()->after('resolution_action');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $cols = [
                'incident_types',
                'recommended_action',
                'recommendation_title',
                'recommendation_notes',
                'resolution_action',
                'resolution_notes'
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('incident_reports', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
