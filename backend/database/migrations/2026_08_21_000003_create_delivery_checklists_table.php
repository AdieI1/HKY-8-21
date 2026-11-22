<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_checklists', function (Blueprint $table) {
            $table->id('checklist_id');
            $table->foreignId('delivery_id')
                ->constrained('deliveries', 'delivery_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->enum('type', ['pre_trip', 'post_trip']);
            $table->json('items');
            $table->decimal('starting_odometer', 12, 2)->nullable();
            $table->decimal('ending_odometer', 12, 2)->nullable();
            $table->decimal('starting_fuel', 10, 2)->nullable();
            $table->decimal('ending_fuel', 10, 2)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['delivery_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_checklists');
    }
};
