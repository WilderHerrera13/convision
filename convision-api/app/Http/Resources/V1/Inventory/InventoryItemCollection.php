<?php

namespace App\Http\Resources\V1\Inventory;

use Illuminate\Http\Resources\Json\ResourceCollection;
use App\Http\Resources\V1\InventoryItemResource;

class InventoryItemCollection extends ResourceCollection
{
    /**
     * The resource that this resource collects.
     *
     * @var string
     */
    public $collects = InventoryItemResource::class;

    /**
     * Transform the resource collection into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return parent::toArray($request);
    }
} 