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
        Schema::create('users', function (Blueprint $table) {

            // Primary Key
            $table->id('user_id');

            // Foreign Key
            $table->foreignId('role_id')
                  ->constrained('roles', 'role_id')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete();

            // User Information
            $table->string('full_name', 100);

            $table->string('email', 100)
                  ->unique();

            $table->string('username', 50)
                  ->nullable()
                  ->unique();

            $table->string('phone', 20)
                  ->nullable();

            $table->string('password', 255);

            // Laravel Authentication
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();

            // Account Status
            $table->enum('status', [
                'active',
                'inactive',
                'blocked'
            ])->default('active');

            // Timestamps
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};