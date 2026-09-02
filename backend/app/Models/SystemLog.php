<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemLog extends Model
{
    protected $table = 'system_logs';

    protected $primaryKey = 'log_id';

    const CREATED_AT = 'timestamp';
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'action'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}