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
        Schema::create('spare_parts_usage', function (Blueprint $table) {

            // Primary Key
            $table->id('usage_id');

            // Foreign Keys
            $table->foreignId('permit_id')
                ->constrained('permits', 'permit_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->foreignId('part_id')
                ->constrained('spare_parts', 'part_id')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            // Usage Information
            $table->integer('quantity_used');

            $table->text('purpose')->nullable();

            $table->date('used_date');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spare_parts_usage');
    }
};