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
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id('incident_id');

            $table->foreignId('delivery_id')
                ->constrained('deliveries', 'delivery_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('reported_by')
                ->constrained('users', 'user_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->enum('incident_type', [
                'accident',
                'delay',
                'damage',
                'lost_item',
                'other',
            ]);

            $table->enum('severity', [
                'low',
                'medium',
                'high',
            ])->default('medium');

            $table->text('description')->nullable();

            $table->string('photo_proof')->nullable();

            $table->enum('status', [
                'pending',
                'investigating',
                'resolved',
            ])->default('pending');

            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();

            $table->index('delivery_id');
            $table->index('reported_by');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};