<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Services\InventoryItemService;
use App\Http\Requests\Api\V1\InventoryItem\StoreInventoryItemRequest;
use App\Http\Requests\Api\V1\InventoryItem\UpdateInventoryItemRequest;
use App\Http\Resources\V1\InventoryItemResource;
use App\Http\Resources\V1\Inventory\InventoryItemCollection;
use App\Http\Resources\V1\Inventory\ProductStockCollection;
use App\Http\Resources\V1\Inventory\ProductInventoryResource;
use Illuminate\Http\Request;

class InventoryItemController extends Controller
{
    protected $inventoryItemService;

    public function __construct(InventoryItemService $inventoryItemService)
    {
        $this->middleware('auth:api');
        $this->inventoryItemService = $inventoryItemService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = $this->inventoryItemService->getFilteredInventoryItems($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $items = $query->paginate($perPage);
        
        return new InventoryItemCollection($items);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInventoryItemRequest $request)
    {
        $validatedData = $request->validated();
        $item = $this->inventoryItemService->createInventoryItem($validatedData);
        return new InventoryItemResource($item);
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryItem $inventoryItem)
    {
        return new InventoryItemResource($inventoryItem->load(['product', 'warehouse', 'warehouseLocation']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInventoryItemRequest $request, InventoryItem $inventoryItem)
    {
        $validatedData = $request->validated();
        $item = $this->inventoryItemService->updateInventoryItem($inventoryItem, $validatedData);
        return new InventoryItemResource($item);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryItem $inventoryItem)
    {
        $this->inventoryItemService->deleteInventoryItem($inventoryItem);
        return response()->json(null, 204);
    }

    /**
     * Get total stock for all products.
     */
    public function totalStock(Request $request)
    {
        $query = $this->inventoryItemService->getTotalStock($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $items = $query->paginate($perPage);
        
        return new ProductStockCollection($items);
    }

    /**
     * Get inventory breakdown by location for a specific product.
     */
    public function productInventory(Product $product)
    {
        $product = $this->inventoryItemService->getProductInventory($product);
        return new ProductInventoryResource($product);
    }
} 