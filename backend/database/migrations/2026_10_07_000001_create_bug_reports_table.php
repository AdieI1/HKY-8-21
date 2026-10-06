<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bug_reports', function (Blueprint $table) {
            $table->id('report_id');
            $table->string('ticket_number', 50)->unique();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('reporter_name')->default('Anonymous User');
            $table->string('reporter_role')->default('user');
            $table->string('app_source')->default('general-app');
            $table->string('category')->default('General');
            $table->text('description');
            $table->text('device_info')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                ->references('user_id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bug_reports');
    }
};
