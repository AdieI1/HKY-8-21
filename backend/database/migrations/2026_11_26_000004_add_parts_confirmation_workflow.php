<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vehicles MODIFY status ENUM('available','in_use','maintenance','waiting_part_confirmation','broken','decommissioned') DEFAULT 'available'");
        }

        Schema::table('vehicle_maintenance', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicle_maintenance', 'parts_status')) {
                $table->string('parts_status', 30)->default('not_required')->after('status');
            }
            if (!Schema::hasColumn('vehicle_maintenance', 'parts_transaction_no')) {
                $table->string('parts_transaction_no', 40)->nullable()->after('parts_status');
            }
        });

        Schema::table('spare_parts_usage', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_parts_usage', 'transaction_no')) {
                $table->string('transaction_no', 40)->nullable()->after('usage_id');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'status')) {
                $table->string('status', 20)->default('confirmed')->after('purpose');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'confirmed_by')) {
                $table->foreignId('confirmed_by')
                    ->nullable()
                    ->after('status')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
            if (!Schema::hasColumn('spare_parts_usage', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            }
            if (!Schema::hasColumn('spare_parts_usage', 'notes')) {
                $table->string('notes', 255)->nullable()->after('confirmed_at');
            }
        });

        // Backfill sequential PTX-00001 transaction numbers on existing confirmed records
        DB::table('spare_parts_usage')
            ->whereNull('transaction_no')
            ->orderBy('usage_id')
            ->get()
            ->each(function ($row) {
                DB::table('spare_parts_usage')
                    ->where('usage_id', $row->usage_id)
                    ->update(['transaction_no' => sprintf('PTX-%05d', $row->usage_id)]);
            });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('vehicles')
                ->where('status', 'waiting_part_confirmation')
                ->update(['status' => 'maintenance']);
            DB::statement("ALTER TABLE vehicles MODIFY status ENUM('available','in_use','maintenance','broken','decommissioned') DEFAULT 'available'");
        }

        Schema::table('spare_parts_usage', function (Blueprint $table) {
            if (Schema::hasColumn('spare_parts_usage', 'confirmed_by')) {
                $table->dropForeign(['confirmed_by']);
            }
            $cols = array_filter(
                ['transaction_no', 'status', 'confirmed_by', 'confirmed_at', 'notes'],
                fn ($c) => Schema::hasColumn('spare_parts_usage', $c)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('vehicle_maintenance', function (Blueprint $table) {
            $cols = array_filter(
                ['parts_status', 'parts_transaction_no'],
                fn ($c) => Schema::hasColumn('vehicle_maintenance', $c)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
