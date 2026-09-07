<?php

namespace App\Events;

use App\Models\AppNotification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    public function __construct(AppNotification $notification)
    {
        $this->notification = [
            'id' => $notification->notification_id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'link' => $notification->link ?: '/overview',
            'time' => $notification->created_at ? $notification->created_at->toIso8601String() : now()->toIso8601String(),
            'is_read' => false,
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('system-notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
