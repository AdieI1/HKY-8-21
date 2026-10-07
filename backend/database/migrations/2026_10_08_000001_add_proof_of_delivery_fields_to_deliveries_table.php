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
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('proof_of_delivery_path', 255)->nullable()->after('receipt_photo');
            $table->string('received_by', 150)->nullable()->after('proof_of_delivery_path');
            $table->text('delivery_notes')->nullable()->after('received_by');
            $table->timestamp('delivered_at')->nullable()->after('delivery_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn([
                'proof_of_delivery_path',
                'received_by',
                'delivery_notes',
                'delivered_at',
            ]);
        });
    }
};
