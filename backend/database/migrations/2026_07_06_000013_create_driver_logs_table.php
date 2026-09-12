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
        Schema::create('driver_logs', function (Blueprint $table) {
            $table->id('log_id');

            $table->foreignId('driver_id')
                ->constrained('drivers', 'driver_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('vehicle_id')
                ->constrained('vehicles', 'vehicle_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('delivery_id')
                ->nullable()
                ->constrained('deliveries', 'delivery_id')
                ->cascadeOnUpdate()
                ->nullOnDelete();

            $table->date('log_date');

            $table->dateTime('time_in')->nullable();

            $table->dateTime('time_out')->nullable();

            $table->text('starting_location')->nullable();

            $table->text('ending_location')->nullable();

            $table->decimal('fuel_used', 10, 2)->nullable();

            $table->decimal('distance_travelled', 10, 2)->nullable();

            $table->text('remarks')->nullable();

            $table->enum('status', [
                'on_duty',
                'off_duty',
                'completed',
                'on_break'
            ])->default('on_duty');

            $table->timestamps();

            $table->index('driver_id');
            $table->index('vehicle_id');
            $table->index('log_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_logs');
    }
};