<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'gross_weight')) {
                $table->decimal('gross_weight', 10, 2)->nullable()->after('capacity');
            }
            if (!Schema::hasColumn('vehicles', 'net_weight')) {
                $table->decimal('net_weight', 10, 2)->nullable()->after('gross_weight');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $cols = array_filter(
                ['gross_weight', 'net_weight'],
                fn ($col) => Schema::hasColumn('vehicles', $col)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
