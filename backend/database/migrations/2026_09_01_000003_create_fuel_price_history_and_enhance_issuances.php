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
        if (!Schema::hasTable('fuel_price_history')) {
            Schema::create('fuel_price_history', function (Blueprint $table) {
                $table->id('price_history_id');
                $table->foreignId('fuel_id')
                    ->constrained('fuel_inventory', 'fuel_id')
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();
                $table->decimal('previous_price', 10, 2)->default(0.00);
                $table->decimal('new_price', 10, 2)->default(0.00);
                $table->foreignId('changed_by')
                    ->nullable()
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        Schema::table('fuel_issuances', function (Blueprint $table) {
            if (!Schema::hasColumn('fuel_issuances', 'transaction_type')) {
                $table->string('transaction_type', 20)->default('out')->after('fuel_id');
            }
            if (!Schema::hasColumn('fuel_issuances', 'supplier_name')) {
                $table->string('supplier_name', 100)->nullable()->after('driver_id');
            }
            if (!Schema::hasColumn('fuel_issuances', 'unit_price')) {
                $table->decimal('unit_price', 10, 2)->nullable()->after('liters');
            }
            if (!Schema::hasColumn('fuel_issuances', 'total_value')) {
                $table->decimal('total_value', 10, 2)->nullable()->after('unit_price');
            }
            if (!Schema::hasColumn('fuel_issuances', 'received_by')) {
                $table->foreignId('received_by')
                    ->nullable()
                    ->after('issued_by')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fuel_issuances', function (Blueprint $table) {
            $table->dropForeign(['received_by']);
            $table->dropColumn(['transaction_type', 'supplier_name', 'unit_price', 'total_value', 'received_by']);
        });

        Schema::dropIfExists('fuel_price_history');
    }
};
