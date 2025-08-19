<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProductCategory\ProductCategoryCollection;
use App\Http\Resources\V1\ProductCategory\ProductCategoryResource;
use App\Models\ProductCategory;
use App\Services\ProductCategoryService;
use Illuminate\Http\Request;
use App\Http\Requests\Api\V1\ProductCategory\StoreProductCategoryRequest;
use App\Http\Requests\Api\V1\ProductCategory\UpdateProductCategoryRequest;
use App\Http\Resources\V1\ProductCategory\ProductCategoryCountCollection;

class ProductCategoryController extends Controller
{
    protected $productCategoryService;

    public function __construct(ProductCategoryService $productCategoryService)
    {
        $this->middleware('auth:api');
        $this->productCategoryService = $productCategoryService;
    }

    public function index(Request $request)
    {
        $query = ProductCategory::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $categories = $query->paginate($perPage);
        
        return new ProductCategoryCollection($categories);
    }

    public function show(ProductCategory $productCategory)
    {
        return new ProductCategoryResource($productCategory);
    }

    public function all()
    {
        $categories = $this->productCategoryService->getAllActiveCategories();
        return ProductCategoryResource::collection($categories);
    }

    public function productsCount()
    {
        $categoriesData = $this->productCategoryService->getCategoriesWithProductsCount();
        return new ProductCategoryCountCollection($categoriesData);
    }

    public function store(StoreProductCategoryRequest $request)
    {
        $validatedData = $request->validated();
        $category = $this->productCategoryService->createProductCategory($validatedData);
        return new ProductCategoryResource($category);
    }

    public function update(UpdateProductCategoryRequest $request, ProductCategory $productCategory)
    {
        $validatedData = $request->validated();
        $category = $this->productCategoryService->updateProductCategory($productCategory, $validatedData);
        return new ProductCategoryResource($category);
    }

    public function destroy(ProductCategory $productCategory)
    {
        $this->productCategoryService->deleteProductCategory($productCategory);
        return response()->json(null, 204);
    }
} 