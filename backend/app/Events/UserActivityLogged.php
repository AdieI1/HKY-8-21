<?php

namespace App\Events;

use App\Models\SystemLog;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserActivityLogged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $activity;

    public function __construct(SystemLog $log)
    {
        $log->loadMissing('user.role');
        $this->activity = [
            'id' => 'log-' . $log->log_id,
            'log_id' => $log->log_id,
            'user_id' => $log->user_id,
            'user_name' => $log->user?->full_name ?? 'Staff User',
            'role' => $log->user?->role?->role_name ?? 'Staff',
            'action' => $log->action,
            'timestamp' => $log->timestamp ? (is_string($log->timestamp) ? $log->timestamp : $log->timestamp->toIso8601String()) : now()->toIso8601String(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('system-activities'),
            new Channel('system-notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'activity.created';
    }
}
