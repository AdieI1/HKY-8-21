<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'fuel_issuance_status')) {
                $table->string('fuel_issuance_status', 20)->default('not_required')->after('fuel_receipt_no');
            }
        });

        Schema::table('fuel_issuances', function (Blueprint $table) {
            if (!Schema::hasColumn('fuel_issuances', 'delivery_id')) {
                $table->unsignedBigInteger('delivery_id')->nullable()->after('driver_id');
            }
            if (!Schema::hasColumn('fuel_issuances', 'fuel_receipt_no')) {
                $table->string('fuel_receipt_no', 50)->nullable()->after('purpose');
            }
            if (!Schema::hasColumn('fuel_issuances', 'status')) {
                $table->string('status', 20)->default('confirmed')->after('fuel_receipt_no');
            }
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            if (Schema::hasColumn('deliveries', 'fuel_issuance_status')) {
                $table->dropColumn('fuel_issuance_status');
            }
        });

        Schema::table('fuel_issuances', function (Blueprint $table) {
            $cols = array_filter(
                ['delivery_id', 'fuel_receipt_no', 'status'],
                fn ($c) => Schema::hasColumn('fuel_issuances', $c)
            );
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
