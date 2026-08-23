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
        Schema::create('deliveries', function (Blueprint $table) {

            // Primary Key
            $table->id('delivery_id');

            // Foreign Keys
            $table->foreignId('request_id')
                ->constrained('delivery_requests', 'request_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('drivers', 'driver_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('vehicle_id')
                ->nullable()
                ->constrained('vehicles', 'vehicle_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('assigned_by')
                ->nullable()
                ->constrained('users', 'user_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

         
            $table->foreignId('permit_id')
                ->nullable()
                ->constrained('permits', 'permit_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();
  

            // Delivery Information
            $table->enum('status', [
                'assigned',
                'accepted',
                'rejected',
                'arrived_pickup',
                'out_for_delivery',
                'arrived_dropoff',
                'returning_to_hq',
                'completed'
            ])->default('assigned');

            $table->decimal('trip_cost', 10, 2)->default(0.00);

            $table->string('receipt_photo', 255)->nullable();

            $table->enum('payment_verification', [
                'pending',
                'approved',
                'rejected'
            ])->default('pending');

            $table->dateTime('start_time')->nullable();

            $table->dateTime('end_time')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};