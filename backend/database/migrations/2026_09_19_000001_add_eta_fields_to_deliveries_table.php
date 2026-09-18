<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->unsignedInteger('estimated_duration_days')->default(2)->after('trip_date');
            $table->dateTime('estimated_delivery_date')->nullable()->after('estimated_duration_days');
            $table->string('delay_reason')->nullable()->after('estimated_delivery_date');
            $table->dateTime('delay_notified_at')->nullable()->after('delay_reason');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'estimated_duration_days',
                'estimated_delivery_date',
                'delay_reason',
                'delay_notified_at',
            ]);
        });
    }
};
