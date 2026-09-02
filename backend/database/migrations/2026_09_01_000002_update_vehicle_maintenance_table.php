<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehicle_maintenance', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicle_maintenance', 'maintained_by_name')) {
                $table->string('maintained_by_name', 150)->nullable()->after('maintained_by');
            }
            if (!Schema::hasColumn('vehicle_maintenance', 'notes')) {
                $table->text('notes')->nullable()->after('description');
            }
            if (!Schema::hasColumn('vehicle_maintenance', 'maintenance_cost')) {
                $table->decimal('maintenance_cost', 10, 2)->default(0.00)->after('total_cost');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vehicle_maintenance MODIFY COLUMN maintenance_type VARCHAR(100) NOT NULL");
            DB::statement("ALTER TABLE vehicle_maintenance MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Scheduled'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_maintenance', function (Blueprint $table) {
            $table->dropColumn(['maintained_by_name', 'notes', 'maintenance_cost']);
        });
    }
};
