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
        Schema::create('vehicle_maintenance', function (Blueprint $table) {
            $table->id('maintenance_id');

            $table->foreignId('vehicle_id')
                ->constrained('vehicles', 'vehicle_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('part_id')
                ->nullable()
                ->constrained('spare_parts', 'part_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('maintained_by')
                ->nullable()
                ->constrained('users', 'user_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->enum('maintenance_type', [
                'oil_change',
                'tire_replacement',
                'engine_repair',
                'brake_check',
                'battery_replacement',
                'general_checkup',
                'other'
            ]);

            $table->text('description')->nullable();

            $table->date('maintenance_date');

            $table->date('next_maintenance_date')->nullable();

            $table->decimal('total_cost', 10, 2)->default(0.00);

            $table->decimal('odometer_at_service', 10, 2)->nullable();

            $table->enum('status', [
                'pending',
                'ongoing',
                'completed'
            ])->default('pending');

            $table->timestamps();

            $table->index('vehicle_id');
            $table->index('maintenance_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_maintenance');
    }
};