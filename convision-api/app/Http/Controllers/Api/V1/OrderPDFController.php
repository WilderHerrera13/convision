<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class OrderPDFController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->except(['generateFromToken']);
    }

    /**
     * Generate a professional, colorful PDF for an order summary and return as stream
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function generate($id)
    {
        // Find the order with related data
        $order = Order::with([
            'patient', 
            'items.lens.brand', 
            'items.lens.material', 
            'items.lens.treatment',
            'appointment.prescription',
            'laboratory',
            'createdBy'
        ])->findOrFail($id);

        // Verify user has permission to view this order
        $user = Auth::user();
        if ($user->role !== 'admin' && $user->role !== 'receptionist' && $order->created_by !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Generate the PDF using a custom view with professional design
        $pdf = PDF::loadView('pdfs.order', [
            'order' => $order,
            'date' => now()->format('d/m/Y'),
            'time' => now()->format('h:i A'),
        ]);

        // Set paper to A4 and customize PDF settings for better quality
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true,
            'isPhpEnabled' => true,
            'defaultFont' => 'Helvetica',
            'dpi' => 150,
        ]);

        // Get the PDF content
        $content = $pdf->output();
        $filename = "order-{$order->order_number}.pdf";

        // Return with headers that force download
        return response($content)
            ->header('Content-Type', 'application/octet-stream')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->header('Content-Length', strlen($content))
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Cache-Control', 'post-check=0, pre-check=0')
            ->header('Pragma', 'no-cache')
            ->header('X-Content-Type-Options', 'nosniff');
    }

    /**
     * Generate PDF from token (for direct download links)
     * 
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function generateFromToken(Request $request, $id)
    {
        // Check if token is provided
        if (!$request->has('token')) {
            return response()->json(['error' => 'Token is required'], 401);
        }
        
        // Set token for authentication
        Auth::setToken($request->token);
        
        try {
            // Attempt to authenticate with token
            if (!$user = Auth::user()) {
                return response()->json(['error' => 'Invalid token'], 401);
            }
            
            // If authentication succeeds, generate PDF
            return $this->generate($id);
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Authentication error: ' . $e->getMessage()], 401);
        }
    }
} 