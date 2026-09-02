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
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE spare_parts_usage MODIFY COLUMN permit_id BIGINT UNSIGNED NULL");
        }

        Schema::table('spare_parts_usage', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_parts_usage', 'transaction_type')) {
                $table->string('transaction_type', 20)->default('out')->after('part_id');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'vehicle_id')) {
                $table->foreignId('vehicle_id')
                    ->nullable()
                    ->after('transaction_type')
                    ->constrained('vehicles', 'vehicle_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
            if (!Schema::hasColumn('spare_parts_usage', 'maintenance_id')) {
                $table->foreignId('maintenance_id')
                    ->nullable()
                    ->after('vehicle_id')
                    ->constrained('vehicle_maintenance', 'maintenance_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
            if (!Schema::hasColumn('spare_parts_usage', 'user_id')) {
                $table->foreignId('user_id')
                    ->nullable()
                    ->after('maintenance_id')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
            if (!Schema::hasColumn('spare_parts_usage', 'supplier_name')) {
                $table->string('supplier_name', 100)->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'unit_price')) {
                $table->decimal('unit_price', 10, 2)->nullable()->after('quantity_used');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'total_value')) {
                $table->decimal('total_value', 10, 2)->nullable()->after('unit_price');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spare_parts_usage', function (Blueprint $table) {
            $table->dropForeign(['vehicle_id']);
            $table->dropForeign(['maintenance_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'transaction_type',
                'vehicle_id',
                'maintenance_id',
                'user_id',
                'supplier_name',
                'unit_price',
                'total_value',
            ]);
        });
    }
};
