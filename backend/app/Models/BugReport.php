<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BugReport extends Model
{
    use HasFactory;

    protected $table = 'bug_reports';
    protected $primaryKey = 'report_id';

    protected $fillable = [
        'ticket_number',
        'user_id',
        'reporter_name',
        'reporter_role',
        'app_source',
        'category',
        'description',
        'device_info',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->ticket_number)) {
                $maxId = (int) (static::max('report_id') ?? 0) + 1;
                $model->ticket_number = 'TCKT-' . str_pad($maxId, 3, '0', STR_PAD_LEFT);
            }
        });
    }
}
