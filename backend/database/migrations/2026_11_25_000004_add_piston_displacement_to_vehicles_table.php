<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'piston_displacement')) {
                $table->decimal('piston_displacement', 10, 2)->nullable()->after('body_type');
            }
            if (Schema::hasColumn('vehicles', 'vehicle_category')) {
                $table->string('vehicle_category', 50)->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            if (Schema::hasColumn('vehicles', 'piston_displacement')) {
                $table->dropColumn('piston_displacement');
            }
        });
    }
};
