<?php

namespace App\Services;

use App\Models\Note;
use App\Models\User;
use App\Models\Lens;
use App\Models\Product;
use App\Models\Appointment;
use Illuminate\Pagination\LengthAwarePaginator;

class NoteService
{
    public function getNotesForResource(string $type, int $id, int $perPage): LengthAwarePaginator
    {
        $this->validateResourceType($type);
        $this->validateResourceExists($type, $id);
        
        return Note::where('notable_type', $this->getModelClass($type))
            ->where('notable_id', $id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function createNoteForResource(string $type, int $id, string $content, User $user): Note
    {
        $this->validateResourceType($type);
        $this->validateResourceExists($type, $id);
        
        $modelClass = $this->getModelClass($type);
        $resource = $modelClass::findOrFail($id);
        
        $note = $resource->notes()->create([
            'content' => $content,
            'user_id' => $user->id,
        ]);
        
        return Note::find($note->id);
    }

    private function validateResourceType(string $type): void
    {
        $allowedTypes = ['lenses', 'products', 'appointments'];
        
        if (!in_array($type, $allowedTypes)) {
            abort(400, 'Invalid resource type. Allowed types: ' . implode(', ', $allowedTypes));
        }
    }

    private function validateResourceExists(string $type, int $id): void
    {
        $modelClass = $this->getModelClass($type);
        
        if (!$modelClass::find($id)) {
            abort(404, ucfirst(rtrim($type, 's')) . ' not found');
        }
    }

    private function getModelClass(string $type): string
    {
        $mapping = [
            'lenses' => Lens::class,
            'products' => Product::class,
            'appointments' => Appointment::class,
        ];
        
        return $mapping[$type];
    }
} 