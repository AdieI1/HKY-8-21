<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_requests', 'vip_voucher_amount')) {
                $table->decimal('vip_voucher_amount', 10, 2)->default(0)->after('total_price');
            }
            if (!Schema::hasColumn('delivery_requests', 'vip_voucher_code')) {
                $table->string('vip_voucher_code', 40)->nullable()->after('vip_voucher_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $dropCols = [];
            if (Schema::hasColumn('delivery_requests', 'vip_voucher_code')) {
                $dropCols[] = 'vip_voucher_code';
            }
            if (Schema::hasColumn('delivery_requests', 'vip_voucher_amount')) {
                $dropCols[] = 'vip_voucher_amount';
            }
            if (!empty($dropCols)) {
                $table->dropColumn($dropCols);
            }
        });
    }
};
