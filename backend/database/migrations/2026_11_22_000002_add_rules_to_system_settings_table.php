<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('system_settings', 'system_config')) {
                $table->json('system_config')->nullable()->after('weight_rate');
            }
            if (!Schema::hasColumn('system_settings', 'notification_rules')) {
                $table->json('notification_rules')->nullable()->after('system_config');
            }
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            if (Schema::hasColumn('system_settings', 'notification_rules')) {
                $table->dropColumn('notification_rules');
            }
            if (Schema::hasColumn('system_settings', 'system_config')) {
                $table->dropColumn('system_config');
            }
        });
    }
};
