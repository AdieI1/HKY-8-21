<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('incident_reports', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->nullable()->after('cargo_condition');
            }
            if (!Schema::hasColumn('incident_reports', 'refund_reason')) {
                $table->string('refund_reason', 150)->nullable()->after('refund_amount');
            }
            if (!Schema::hasColumn('incident_reports', 'refund_status')) {
                $table->string('refund_status', 50)->nullable()->default('pending_review')->after('refund_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $cols = ['refund_amount', 'refund_reason', 'refund_status'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('incident_reports', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
