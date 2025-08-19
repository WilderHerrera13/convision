<?php

namespace App\Http\Resources\V1\Lens;

use Illuminate\Http\Resources\Json\ResourceCollection;

class LensTypeCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @param  Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 