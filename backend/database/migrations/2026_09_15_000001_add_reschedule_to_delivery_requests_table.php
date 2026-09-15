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
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->date('reschedule_proposed_date')->nullable()->after('scheduled_time_slot');
            $table->string('reschedule_proposed_time_slot', 100)->nullable()->after('reschedule_proposed_date');
            $table->string('reschedule_status', 50)->nullable()->after('reschedule_proposed_time_slot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn([
                'reschedule_proposed_date',
                'reschedule_proposed_time_slot',
                'reschedule_status'
            ]);
        });
    }
};
