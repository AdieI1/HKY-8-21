<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('delivery_requests', 'service_type')) {
                $table->string('service_type', 50)->default('standard')->after('cargo_type');
            }
            if (!Schema::hasColumn('delivery_requests', 'container_number')) {
                $table->string('container_number', 50)->nullable()->after('service_type');
            }
            if (!Schema::hasColumn('delivery_requests', 'seal_number')) {
                $table->string('seal_number', 50)->nullable()->after('container_number');
            }
            if (!Schema::hasColumn('delivery_requests', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('status');
            }
        });

        Schema::table('deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('deliveries', 'collection_receipt_no')) {
                $table->string('collection_receipt_no', 50)->nullable()->after('payment_verification');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_amount')) {
                $table->decimal('collection_receipt_amount', 12, 2)->nullable()->after('collection_receipt_no');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_payment_mode')) {
                $table->string('collection_receipt_payment_mode', 50)->nullable()->after('collection_receipt_amount');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_path')) {
                $table->string('collection_receipt_path', 255)->nullable()->after('collection_receipt_payment_mode');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_issued_at')) {
                $table->timestamp('collection_receipt_issued_at')->nullable()->after('collection_receipt_path');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_issued_by')) {
                $table->unsignedBigInteger('collection_receipt_issued_by')->nullable()->after('collection_receipt_issued_at');
            }
            if (!Schema::hasColumn('deliveries', 'collection_receipt_notes')) {
                $table->text('collection_receipt_notes')->nullable()->after('collection_receipt_issued_by');
            }
            if (!Schema::hasColumn('deliveries', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('remarks');
            }
            if (!Schema::hasColumn('deliveries', 'cancelled_by')) {
                $table->unsignedBigInteger('cancelled_by')->nullable()->after('cancellation_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            $table->dropColumn(['service_type', 'container_number', 'seal_number', 'cancellation_reason']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'collection_receipt_no',
                'collection_receipt_amount',
                'collection_receipt_payment_mode',
                'collection_receipt_path',
                'collection_receipt_issued_at',
                'collection_receipt_issued_by',
                'collection_receipt_notes',
                'cancellation_reason',
                'cancelled_by'
            ]);
        });
    }
};
