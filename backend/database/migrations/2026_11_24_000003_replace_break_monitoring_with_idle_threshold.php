<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('system_settings')) {
            return;
        }

        $rows = DB::table('system_settings')->get();
        foreach ($rows as $row) {
            if (empty($row->system_config)) {
                continue;
            }
            $cfg = json_decode($row->system_config, true);
            if (!is_array($cfg)) {
                continue;
            }

            $changed = false;
            if (array_key_exists('break_monitoring', $cfg)) {
                unset($cfg['break_monitoring']);
                $changed = true;
            }
            if (!array_key_exists('idle_duration_threshold', $cfg)) {
                $cfg['idle_duration_threshold'] = ['value' => 30, 'unit' => 'mins'];
                $changed = true;
            }
            if ($changed) {
                DB::table('system_settings')->where('id', $row->id)->update([
                    'system_config' => json_encode($cfg),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Non-destructive JSON cleanup
    }
};
