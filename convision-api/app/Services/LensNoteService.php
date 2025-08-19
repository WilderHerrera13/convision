<?php

namespace App\Services;

use App\Models\Note;
use App\Models\User;
use App\Models\Lens;
use Illuminate\Pagination\LengthAwarePaginator;

class LensNoteService
{
    public function getNotesForLens(Lens $lens, int $perPage): LengthAwarePaginator
    {
        return Note::where('noteable_type', Lens::class)
            ->where('noteable_id', $lens->id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function createNoteForLens(Lens $lens, string $content, User $user): Note
    {
        return Note::create([
            'content' => $content,
            'user_id' => $user->id,
            'noteable_type' => Lens::class,
            'noteable_id' => $lens->id,
        ]);
    }
} 