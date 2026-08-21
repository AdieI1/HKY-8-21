<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            if (!Schema::hasColumn('spare_parts', 'unit')) {
                $table->string('unit', 30)->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'brand')) {
                $table->string('brand', 100)->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'model_part_code')) {
                $table->string('model_part_code', 100)->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'warranty')) {
                $table->string('warranty', 100)->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'supplier_contact')) {
                $table->string('supplier_contact', 100)->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'supplier_address')) {
                $table->text('supplier_address')->nullable();
            }

            if (!Schema::hasColumn('spare_parts', 'image')) {
                $table->string('image')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $columns = [
                'unit',
                'brand',
                'model_part_code',
                'warranty',
                'supplier_contact',
                'supplier_address',
                'image',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('spare_parts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};