<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE drivers MODIFY availability_status ENUM('available','busy','off_duty','on_leave','pending_leave','offline') DEFAULT 'off_duty'");
        }

        Schema::table('drivers', function (Blueprint $table) {
            if (!Schema::hasColumn('drivers', 'last_duty_date')) {
                $table->date('last_duty_date')->nullable()->after('availability_status');
            }
        });

        if (!Schema::hasTable('driver_leaves')) {
            Schema::create('driver_leaves', function (Blueprint $table) {
                $table->id('leave_id');
                $table->foreignId('driver_id')
                    ->constrained('drivers', 'driver_id')
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();
                $table->foreignId('user_id')
                    ->constrained('users', 'user_id')
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();
                $table->string('leave_type', 40); // sick_leave | emergency_absence | day_off | vacation
                $table->date('start_date');
                $table->date('end_date');
                $table->text('reason');
                $table->string('attachment_path', 255)->nullable();
                $table->string('status', 30)->default('pending'); // pending | approved | rejected | cancelled | completed
                $table->foreignId('reviewed_by')
                    ->nullable()
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('review_notes', 255)->nullable();
                $table->timestamps();

                $table->index(['driver_id', 'status']);
                $table->index(['start_date', 'end_date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_leaves');

        Schema::table('drivers', function (Blueprint $table) {
            if (Schema::hasColumn('drivers', 'last_duty_date')) {
                $table->dropColumn('last_duty_date');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::table('drivers')
                ->whereIn('availability_status', ['off_duty', 'on_leave', 'pending_leave'])
                ->update(['availability_status' => 'offline']);
            DB::statement("ALTER TABLE drivers MODIFY availability_status ENUM('available','busy','offline') DEFAULT 'offline'");
        }
    }
};
