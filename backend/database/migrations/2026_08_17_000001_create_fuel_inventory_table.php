<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fuel_inventory', function (Blueprint $table) {
            $table->id('fuel_id');
            $table->string('fuel_type', 50);
            $table->string('supplier_name', 100)->nullable();
            $table->decimal('current_stock', 10, 2)->default(0);
            $table->string('unit', 20)->default('Liters');
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('reorder_level', 10, 2)->default(500);
            $table->date('last_delivery_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fuel_inventory');
    }
};