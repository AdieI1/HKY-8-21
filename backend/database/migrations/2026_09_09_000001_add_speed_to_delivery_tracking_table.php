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
        Schema::table('delivery_tracking', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_tracking', 'speed')) {
                $table->decimal('speed', 6, 2)->nullable()->after('longitude')->comment('Recorded speed in km/h');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_tracking', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_tracking', 'speed')) {
                $table->dropColumn('speed');
            }
        });
    }
};
