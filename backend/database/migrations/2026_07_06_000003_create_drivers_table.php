<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id('driver_id');

            // User relationship
            $table->unsignedBigInteger('user_id');

            // Personal Information
            $table->date('birthdate')->nullable();
            $table->string('nationality', 50)->nullable();

            // License Information
            $table->string('license_number')->nullable();
            $table->string('license_type', 50)->nullable();
            $table->string('restriction_code', 50)->nullable();
            $table->date('license_date_issued')->nullable();
            $table->date('license_expiry_date')->nullable();
            $table->string('authorized_by', 100)->nullable();

            // Health Information
            $table->string('health_condition')->nullable();
            $table->date('last_medical_check')->nullable();
            $table->text('prescriptions')->nullable();
            $table->text('existing_conditions')->nullable();

            // Employment / Contract
            $table->date('date_hired')->nullable();
            $table->string('hired_by', 100)->nullable();
            $table->date('contract_start')->nullable();
            $table->date('contract_end')->nullable();

            // Driver Status
            $table->enum('availability_status', [
                'available',
                'busy',
                'offline'
            ])->default('offline');

            $table->integer('experience_years')->nullable();

            $table->enum('status', [
                'active',
                'inactive'
            ])->default('active');

            $table->timestamps();

            // Foreign Key
            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};