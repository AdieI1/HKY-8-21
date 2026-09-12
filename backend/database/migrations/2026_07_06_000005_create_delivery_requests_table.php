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
        Schema::create('delivery_requests', function (Blueprint $table) {

            // Primary Key
            $table->id('request_id');

            // Foreign Key
            $table->foreignId('customer_id')
                ->constrained('users', 'user_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            // Request Information
            $table->string('cargo_type', 100)->nullable();

            $table->enum('fragility', [
                'low',
                'medium',
                'high'
            ])->nullable();

            $table->decimal('weight', 10, 2)->nullable();

            $table->text('pickup_address')->nullable();

            $table->text('dropoff_address')->nullable();

            $table->decimal('distance_km', 10, 2)->nullable();

            $table->enum('status', [
                'pending',
                'approved',
                'rejected'
            ])->default('pending');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_requests');
    }
};