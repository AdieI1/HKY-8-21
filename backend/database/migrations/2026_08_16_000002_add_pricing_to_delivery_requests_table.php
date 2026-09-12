<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('delivery_requests', 'total_price')) {
                $table->decimal('total_price', 10, 2)->nullable()->after('distance_km');
            }
            if (! Schema::hasColumn('delivery_requests', 'payment_term')) {
                $table->enum('payment_term', ['downpayment', 'full'])->nullable()->after('total_price');
            }
            if (! Schema::hasColumn('delivery_requests', 'payment_method')) {
                $table->enum('payment_method', ['bank_transfer', 'cash'])->nullable()->after('payment_term');
            }
        });

        DB::statement("ALTER TABLE delivery_requests MODIFY status ENUM('draft','pending','approved','rejected') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE delivery_requests MODIFY status ENUM('pending','approved','rejected') DEFAULT 'pending'");

        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['total_price', 'payment_term', 'payment_method']);
        });
    }
};