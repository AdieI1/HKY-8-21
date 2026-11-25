<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('delivery_requests') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE delivery_requests MODIFY fragility ENUM('low', 'medium', 'high', 'perishable') NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('delivery_requests') && DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE delivery_requests SET fragility = 'high' WHERE fragility = 'perishable'");
            DB::statement("ALTER TABLE delivery_requests MODIFY fragility ENUM('low', 'medium', 'high') NULL");
        }
    }
};
