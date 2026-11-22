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
            $table->boolean('is_scheduled')->default(false)->after('status');
            $table->date('scheduled_date')->nullable()->after('is_scheduled');
            $table->string('scheduled_time_slot', 100)->nullable()->after('scheduled_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['is_scheduled', 'scheduled_date', 'scheduled_time_slot']);
        });
    }
};
