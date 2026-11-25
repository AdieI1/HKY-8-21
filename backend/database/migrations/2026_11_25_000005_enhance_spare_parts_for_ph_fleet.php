<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_parts', 'part_condition')) {
                $table->string('part_condition', 30)->nullable()->after('brand');
            }
            if (!Schema::hasColumn('spare_parts', 'compatible_models')) {
                $table->string('compatible_models', 150)->nullable()->after('model_part_code');
            }
            if (!Schema::hasColumn('spare_parts', 'storage_location')) {
                $table->string('storage_location', 80)->nullable()->after('compatible_models');
            }
        });
    }

    public function down(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $cols = array_filter(
                ['part_condition', 'compatible_models', 'storage_location'],
                fn ($col) => Schema::hasColumn('spare_parts', $col)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
