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
            $table->string('item_permit_path', 255)->nullable()->after('payment_receipt_path');
            $table->string('item_permit_type', 100)->nullable()->after('item_permit_path');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('area_permit_path', 255)->nullable()->after('permit_id');
            $table->string('area_permit_type', 100)->nullable()->after('area_permit_path');
            $table->text('permit_notes')->nullable()->after('area_permit_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['item_permit_path', 'item_permit_type']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['area_permit_path', 'area_permit_type', 'permit_notes']);
        });
    }
};
