<?php

namespace App\Events;

use App\Models\Delivery;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeliveryUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $delivery;

    public function __construct(Delivery $delivery)
    {
        $this->delivery = [
            'delivery_id' => $delivery->delivery_id,
            'status' => $delivery->status,
            'vehicle_id' => $delivery->vehicle_id,
            'driver_id' => $delivery->driver_id,
            'updated_at' => $delivery->updated_at ? $delivery->updated_at->toIso8601String() : now()->toIso8601String(),
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
        return 'delivery.updated';
    }
}
