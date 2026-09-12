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
        Schema::create('vehicles', function (Blueprint $table) {

            // Primary Key
            $table->id('vehicle_id');

            // Vehicle Information
            $table->string('plate_number', 20)->unique();
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->year('year_model')->nullable();
            $table->string('vehicle_type', 50)->nullable();

            $table->decimal('capacity', 10, 2)->nullable();
            $table->decimal('mileage', 10, 2)->nullable();
            $table->decimal('odometer_reading', 10, 2)->nullable();

            $table->enum('fuel_type', [
                'diesel',
                'gasoline',
                'electric',
                'hybrid'
            ])->nullable();

            $table->enum('status', [
                'available',
                'in_use',
                'maintenance'
            ])->default('available');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};