<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->date('trip_date')->nullable()->after('status');
            $table->decimal('fuel_issued', 10, 2)->nullable()->after('trip_cost');
            $table->string('fuel_receipt_no', 100)->nullable()->after('fuel_issued');
            $table->text('remarks')->nullable()->after('fuel_receipt_no');
        });

        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->string('payment_receipt_path')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'trip_date',
                'fuel_issued',
                'fuel_receipt_no',
                'remarks',
            ]);
        });

        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn('payment_receipt_path');
        });
    }
};
