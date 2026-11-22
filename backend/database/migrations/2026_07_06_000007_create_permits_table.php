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
        Schema::create('permits', function (Blueprint $table) {

            // Primary Key
            $table->id('permit_id');

            // Foreign Keys
            $table->foreignId('vehicle_id')
                ->constrained('vehicles', 'vehicle_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('driver_id')
                ->constrained('drivers', 'driver_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('issued_by')
                ->constrained('users', 'user_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            // Permit Information
            $table->enum('permit_type', [
                'trip_permit',
                'delivery_permit',
                'maintenance_permit',
                'spare_parts_release'
            ]);

            $table->text('purpose')->nullable();

            $table->text('origin_location')->nullable();

            $table->text('destination_location')->nullable();

            $table->date('permit_date');

            $table->date('expiry_date')->nullable();

            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'expired'
            ])->default('pending');

            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permits');
    }
};