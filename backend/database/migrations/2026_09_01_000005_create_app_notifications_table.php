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
        if (!Schema::hasTable('app_notifications')) {
            Schema::create('app_notifications', function (Blueprint $table) {
                $table->id('notification_id');
                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
                $table->string('type', 50)->default('info');
                $table->string('title', 150);
                $table->text('message');
                $table->string('link', 255)->nullable();
                $table->boolean('is_read')->default(false);
                $table->timestamps();

                $table->index(['user_id', 'is_read']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
