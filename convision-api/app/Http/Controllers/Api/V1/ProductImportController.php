<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ProductImport\ProductImportRequest; // This will be created next
use App\Services\ProductImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request; // Added for type hinting

class ProductImportController extends Controller
{
    protected $productImportService;

    public function __construct(ProductImportService $productImportService)
    {
        $this->middleware('auth:api');
        // Consider adjusting middleware if needed, e.g., admin only
        $this->middleware('admin.or.specialist.role'); 
        $this->productImportService = $productImportService;
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240', // Max 10MB
            'update_mode' => 'nullable|string|in:skip,update,error'
        ]);

        $file = $request->file('file');
        $updateMode = $request->input('update_mode', ProductImportService::UPDATE_MODE_UPDATE);

        $results = $this->productImportService->import($file->getPathname(), $updateMode, $file->getClientOriginalName());

        if (!empty($results['errors'])) {
            return response()->json([
                'message' => 'Import completed with errors.',
                'created' => $results['success'],
                'updated' => $results['updated'],
                'skipped' => $results['skipped'],
                'errors' => $results['errors'],
            ], 422); // Unprocessable Entity if there are errors
        }

        return response()->json([
            'message' => 'Product import completed successfully.',
            'created' => $results['success'],
            'updated' => $results['updated'],
            'skipped' => $results['skipped'],
            'errors' => $results['errors'], // Should be empty here
        ]);
    }
} 