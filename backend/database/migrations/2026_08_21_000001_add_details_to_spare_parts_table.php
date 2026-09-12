<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $table->string('unit', 30)->nullable();
            $table->string('brand', 100)->nullable();
            $table->string('model_part_code', 100)->nullable();
            $table->string('warranty', 100)->nullable();
            $table->string('supplier_contact', 100)->nullable();
            $table->string('supplier_address')->nullable();
            $table->string('image')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('spare_parts', function (Blueprint $table) {
            $table->dropColumn([
                'unit',
                'brand',
                'model_part_code',
                'warranty',
                'supplier_contact',
                'supplier_address',
                'image',
            ]);
        });
    }
};