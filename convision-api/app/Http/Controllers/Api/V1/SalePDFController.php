<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Carbon\Carbon;

class SalePDFController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->except(['generateFromToken']);
    }

    /**
     * Generate a professional invoice PDF for a sale and return as stream
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function generate($id, Request $request)
    {
        // Find the sale with related data
        $sale = Sale::with([
            'patient', 
            'order.items.lens.brand', 
            'order.laboratory',
            'payments.paymentMethod',
            'createdBy',
            'appointment.prescription',
            'appointment.specialist'
        ])->findOrFail($id);

        // Verify user has permission to view this sale
        $user = Auth::user();
        if ($user->role !== 'admin' && $user->role !== 'receptionist' && $sale->created_by !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Generate the PDF using a custom view with professional design
        $pdf = PDF::loadView('pdfs.invoice', [
            'sale' => $sale,
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

        // Add metadata to improve document properties
        $pdf->getDomPDF()->add_info('Title', 'Factura #' . $sale->sale_number);
        $pdf->getDomPDF()->add_info('Author', 'CONVISION');
        $pdf->getDomPDF()->add_info('Subject', 'Factura de venta para ' . $sale->patient->first_name . ' ' . $sale->patient->last_name);
        $pdf->getDomPDF()->add_info('Keywords', 'factura, convision, venta, lentes, óptica');
        $pdf->getDomPDF()->add_info('Creator', 'Sistema de CONVISION');

        // Get the PDF content
        $content = $pdf->output();
        $filename = "invoice-{$sale->sale_number}.pdf";

        // Check if this is a preview request
        $isPreview = $request->has('preview') && $request->preview === 'true';
        
        // For preview, use inline disposition to display in browser
        $disposition = $isPreview ? 'inline' : 'attachment';

        // Return with appropriate headers based on preview or download
        return response($content)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', "{$disposition}; filename=\"{$filename}\"");
    }

    /**
     * Generate a PDF from a secure token (for sharing via URL)
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function generateFromToken(Request $request)
    {
        try {
            // Verify token format
            if (!$request->has('token')) {
                return response()->json(['error' => 'Invalid token'], 400);
            }
            
            // Decrypt the token to get sale ID and expiry
            $tokenData = json_decode(Crypt::decrypt($request->token), true);
            
            // Check token expiry
            $expiryTime = Carbon::createFromTimestamp($tokenData['expires']);
            if (now()->gt($expiryTime)) {
                return response()->json(['error' => 'Token expired'], 401);
            }
            
            // Get the sale
            $saleId = $tokenData['sale_id'];
            $sale = Sale::with([
                'patient', 
                'order.items.lens.brand', 
                'order.laboratory',
                'payments.paymentMethod',
                'createdBy',
                'appointment.prescription',
                'appointment.specialist'
            ])->findOrFail($saleId);
            
            // Generate the PDF
            $pdf = PDF::loadView('pdfs.invoice', [
                'sale' => $sale,
                'date' => now()->format('d/m/Y'),
                'time' => now()->format('h:i A'),
            ]);
            
            // Set PDF options
            $pdf->setPaper('a4', 'portrait');
            $pdf->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'defaultFont' => 'Helvetica',
                'dpi' => 150,
            ]);
            
            // Add metadata to improve document properties
            $pdf->getDomPDF()->add_info('Title', 'Factura #' . $sale->sale_number);
            $pdf->getDomPDF()->add_info('Author', 'CONVISION');
            $pdf->getDomPDF()->add_info('Subject', 'Factura de venta para ' . $sale->patient->first_name . ' ' . $sale->patient->last_name);
            $pdf->getDomPDF()->add_info('Keywords', 'factura, convision, venta, lentes, óptica');
            $pdf->getDomPDF()->add_info('Creator', 'Sistema de CONVISION');
            
            // Get the PDF content
            $content = $pdf->output();
            $filename = "invoice-{$sale->sale_number}.pdf";
            
            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';
            
            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', "{$disposition}; filename=\"{$filename}\"");
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token or error generating PDF'], 400);
        }
    }

    /**
     * Create a secure shareable token for PDF download
     *
     * @param int $saleId
     * @param int $expiryMinutes
     * @return string
     */
    public function createShareableToken($saleId, $expiryMinutes = 1440)
    {
        $tokenData = [
            'sale_id' => $saleId,
            'expires' => now()->addMinutes($expiryMinutes)->timestamp,
        ];
        
        return Crypt::encrypt(json_encode($tokenData));
    }
}
