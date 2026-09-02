<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fuel_issuances', function (Blueprint $table) {
            $table->id('issuance_id');

            $table->foreignId('fuel_id')
                ->constrained('fuel_inventory', 'fuel_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('vehicle_id')
                ->nullable()
                ->constrained('vehicles', 'vehicle_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('driver_id')
                ->nullable()
                ->constrained('drivers', 'driver_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('issued_by')
                ->nullable()
                ->constrained('users', 'user_id')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->decimal('liters', 10, 2);
            $table->string('purpose', 100)->nullable();
            $table->timestamp('issued_at')->useCurrent();

            $table->index('fuel_id');
            $table->index('issued_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fuel_issuances');
    }
};