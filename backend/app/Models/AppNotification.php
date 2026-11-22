<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppNotification extends Model
{
    protected $table = 'app_notifications';

    protected $primaryKey = 'notification_id';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'link',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    /**
     * Helper to create a persistent notification
     */
    public static function notify($type, $title, $message, $link = null, $userId = null)
    {
        try {
            $notif = static::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'link' => $link,
                'is_read' => false,
            ]);

            if ($notif) {
                try {
                    \App\Events\NotificationCreated::dispatch($notif);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Broadcast notification error: ' . $e->getMessage());
                }
            }

            return $notif;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to create notification: ' . $e->getMessage());
            return null;
        }
    }
}
