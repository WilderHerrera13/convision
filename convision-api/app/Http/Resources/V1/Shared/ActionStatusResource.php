<?php

namespace App\Http\Resources\V1\Shared;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActionStatusResource extends JsonResource
{
    private $message;
    private $details;

    public function __construct($resource, string $message = 'Action completed successfully.', array $details = [])
    {
        parent::__construct($resource); // $resource can be null or carry additional data if needed
        $this->message = $message;
        $this->details = $details;
    }

    public function toArray($request): array
    {
        $response = [
            'message' => $this->message,
        ];

        if (!empty($this->details)) {
            $response = array_merge($response, $this->details);
        }
        
        // If $this->resource is used and has data, merge it.
        // For bulkUpdateStatus, resource might be the count itself or null if count is in details.
        if ($this->resource !== null && !is_array($this->resource) && !is_object($this->resource)) {
             // If resource is a simple value like a count, we might want to wrap it e.g. ['updated_count' => $this->resource]
             // For now, this example directly merges details. The controller will pass count in details.
        } elseif (is_array($this->resource)) {
            $response = array_merge($response, $this->resource);
        } elseif (is_object($this->resource) && method_exists($this->resource, 'toArray')) {
            $response = array_merge($response, $this->resource->toArray());
        }

        return $response;
    }
} 