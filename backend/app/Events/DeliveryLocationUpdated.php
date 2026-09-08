<?php

namespace App\Events;

use App\Models\Delivery;
use App\Models\DeliveryTracking;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeliveryLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $location;

    public function __construct(Delivery $delivery, DeliveryTracking $tracking)
    {
        $this->location = [
            'delivery_id' => (int) $delivery->delivery_id,
            'latitude' => (float) $tracking->latitude,
            'longitude' => (float) $tracking->longitude,
            'status' => $delivery->status,
            'timestamp' => $tracking->timestamp
                ? $tracking->timestamp->toIso8601String()
                : ($tracking->created_at ? $tracking->created_at->toIso8601String() : now()->toIso8601String()),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('deliveries'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'delivery.location_updated';
    }
}
