<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Remove unused 'rejected' status from deliveries.status enum
        if (Schema::hasTable('deliveries') && Schema::hasColumn('deliveries', 'status')) {
            DB::statement("ALTER TABLE `deliveries` MODIFY COLUMN `status` ENUM('draft','pending','assigned','accepted','arrived_pickup','loading_cargo','out_for_delivery','arrived_dropoff','unloading_cargo','returning_to_hq','completed') NOT NULL DEFAULT 'pending'");
        }

        // 2. Strip unused driver-decline keys from system_settings JSON columns
        if (Schema::hasTable('system_settings')) {
            $rows = DB::table('system_settings')->get();
            foreach ($rows as $row) {
                $updates = [];

                if (!empty($row->system_config)) {
                    $cfg = json_decode($row->system_config, true);
                    if (is_array($cfg) && array_key_exists('delivery_decline_threshold', $cfg)) {
                        unset($cfg['delivery_decline_threshold']);
                        $updates['system_config'] = json_encode($cfg);
                    }
                }

                if (!empty($row->notification_rules)) {
                    $rules = json_decode($row->notification_rules, true);
                    if (is_array($rules) && array_key_exists('declined_delivery', $rules)) {
                        unset($rules['declined_delivery']);
                        $updates['notification_rules'] = json_encode($rules);
                    }
                }

                if (!empty($updates)) {
                    DB::table('system_settings')->where('id', $row->id)->update($updates);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('deliveries') && Schema::hasColumn('deliveries', 'status')) {
            DB::statement("ALTER TABLE `deliveries` MODIFY COLUMN `status` ENUM('draft','pending','assigned','accepted','rejected','arrived_pickup','loading_cargo','out_for_delivery','arrived_dropoff','unloading_cargo','returning_to_hq','completed') NOT NULL DEFAULT 'pending'");
        }
    }
};
