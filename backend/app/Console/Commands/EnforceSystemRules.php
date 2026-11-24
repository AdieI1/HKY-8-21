<?php

namespace App\Console\Commands;

use App\Services\SystemRuleEvaluator;
use Illuminate\Console\Command;

class EnforceSystemRules extends Command
{
    protected $signature = 'system:enforce-rules';

    protected $description = 'Enforce System Configuration thresholds (archive retention, overdue requests, GPS disconnect, critical alerts, idle alerts)';

    public function handle(SystemRuleEvaluator $evaluator): int
    {
        $summary = $evaluator->enforceAll();

        $this->info('System rules enforced successfully:');
        foreach ($summary as $key => $count) {
            $this->line("  - {$key}: {$count}");
        }

        return self::SUCCESS;
    }
}
