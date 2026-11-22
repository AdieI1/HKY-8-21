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
            if (!Schema::hasColumn('delivery_requests', 'approved_by')) {
                $table->foreignId('approved_by')
                    ->nullable()
                    ->after('status')
                    ->constrained('users', 'user_id')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('delivery_requests', 'approved_at')) {
                $table->timestamp('approved_at')
                    ->nullable()
                    ->after('approved_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_requests', function (Blueprint $table) {
            if (Schema::hasColumn('delivery_requests', 'approved_by')) {
                $table->dropForeign(['approved_by']);
                $table->dropColumn('approved_by');
            }
            if (Schema::hasColumn('delivery_requests', 'approved_at')) {
                $table->dropColumn('approved_at');
            }
        });
    }
};
