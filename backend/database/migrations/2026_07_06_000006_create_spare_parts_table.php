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
        Schema::create('spare_parts', function (Blueprint $table) {
            $table->id('part_id');

            $table->string('part_name', 100);

            $table->string('category', 50)->nullable();

            $table->text('description')->nullable();

            $table->integer('quantity_in_stock')->default(0);

            $table->decimal('unit_price', 10, 2)->default(0.00);

            $table->integer('reorder_level')->default(5);

            $table->string('supplier_name', 100)->nullable();

            $table->enum('status', [
                'available',
                'low_stock',
                'out_of_stock'
            ])->default('available');

            $table->timestamps();

            $table->index('part_name');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spare_parts');
    }
};