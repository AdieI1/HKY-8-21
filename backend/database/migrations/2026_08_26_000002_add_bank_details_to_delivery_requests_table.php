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
            if (!Schema::hasColumn('delivery_requests', 'bank_name')) {
                $table->string('bank_name', 100)->nullable()->after('payment_receipt_path');
            }
            if (!Schema::hasColumn('delivery_requests', 'account_name')) {
                $table->string('account_name', 100)->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('delivery_requests', 'account_number')) {
                $table->string('account_number', 50)->nullable()->after('account_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'account_name', 'account_number']);
        });
    }
};
