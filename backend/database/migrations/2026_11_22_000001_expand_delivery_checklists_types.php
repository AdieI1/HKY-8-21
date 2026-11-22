<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Widen type from ENUM('pre_trip', 'post_trip') to VARCHAR(50)
        // to support pre_loading, post_loading, pre_unloading, and post_unloading checklists.
        try {
            DB::statement("ALTER TABLE delivery_checklists MODIFY COLUMN type VARCHAR(50) NOT NULL");
        } catch (\Throwable $e) {
            // Fallback for drivers that don't support MySQL MODIFY syntax
        }

        Schema::table('delivery_checklists', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_checklists', 'remarks')) {
                $table->text('remarks')->nullable()->after('inspector_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_checklists', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_checklists', 'remarks')) {
                $table->dropColumn('remarks');
            }
        });
    }
};
