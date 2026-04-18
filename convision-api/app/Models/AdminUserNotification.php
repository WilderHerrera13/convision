<?php

namespace App\Models;

use App\Traits\ApiFilterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminUserNotification extends Model
{
    use HasFactory;
    use ApiFilterable;

    public const KIND_SYSTEM = 'system';

    public const KIND_OPERATIONAL = 'operational';

    public const KIND_MESSAGE = 'message';

    protected $fillable = [
        'user_id',
        'title',
        'body',
        'kind',
        'action_url',
        'read_at',
        'archived_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
