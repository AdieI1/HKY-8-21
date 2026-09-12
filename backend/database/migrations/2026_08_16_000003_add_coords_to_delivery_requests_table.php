<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('delivery_requests', 'pickup_lat')) {
                $table->decimal('pickup_lat', 10, 7)->nullable()->after('pickup_address');
            }
            if (! Schema::hasColumn('delivery_requests', 'pickup_lng')) {
                $table->decimal('pickup_lng', 10, 7)->nullable()->after('pickup_lat');
            }
            if (! Schema::hasColumn('delivery_requests', 'dropoff_lat')) {
                $table->decimal('dropoff_lat', 10, 7)->nullable()->after('dropoff_address');
            }
            if (! Schema::hasColumn('delivery_requests', 'dropoff_lng')) {
                $table->decimal('dropoff_lng', 10, 7)->nullable()->after('dropoff_lat');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng']);
        });
    }
};