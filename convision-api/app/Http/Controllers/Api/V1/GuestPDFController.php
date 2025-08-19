<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Sale;
use App\Models\ClinicalHistory;
use App\Models\ClinicalEvolution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class GuestPDFController extends Controller
{
    /**
     * Constructor does not apply auth middleware since this is for guest access
     */
    public function __construct()
    {
        // No middleware - this is for public access with token auth
    }

    /**
     * Download order PDF using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadOrderPdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'order', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

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

            // Generate the PDF
            $pdf = PDF::loadView('pdfs.order', [
                'order' => $order,
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

            // Get the PDF content
            $content = $pdf->output();
            $filename = "order-{$order->order_number}.pdf";

            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';

            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download laboratory order PDF using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadLaboratoryOrderPdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'laboratory_order', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

            // Find the order with related data
            $order = Order::with([
                'patient', 
                'items.lens.brand', 
                'items.lens.material', 
                'items.lens.treatment',
                'items.lens.lensType',
                'appointment.prescription',
                'laboratory',
                'createdBy'
            ])->findOrFail($id);

            // Check if order has a laboratory assigned
            if (!$order->laboratory) {
                return response()->json(['error' => 'No laboratory assigned to this order'], 400);
            }

            // Generate the PDF
            $pdf = PDF::loadView('pdfs.laboratory_order', [
                'order' => $order,
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

            // Get the PDF content
            $content = $pdf->output();
            $filename = "laboratory-order-{$order->order_number}.pdf";

            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';

            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download sale invoice PDF using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadSalePdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'sale', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

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
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download quote PDF using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadQuotePdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'quote', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

            // Find the quote with related data
            $quote = \App\Models\Quote::with([
                'patient', 
                'items.product.brand',
                'createdBy'
            ])->findOrFail($id);

            // Generate the PDF
            $pdf = PDF::loadView('pdfs.quote', [
                'quote' => $quote,
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

            // Get the PDF content
            $content = $pdf->output();
            $filename = "cotizacion-{$quote->quote_number}.pdf";

            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';

            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download clinical history PDF using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadClinicalHistoryPdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'clinical_history', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

            // Find the clinical history with related data
            $clinicalHistory = ClinicalHistory::with([
                'patient',
                'creator',
                'evolutions' => function ($query) {
                    $query->orderBy('evolution_date', 'desc');
                },
                'evolutions.creator'
            ])->findOrFail($id);

            // Generate the PDF (assuming there's a clinical_history view)
            $pdf = PDF::loadView('pdfs.clinical_history', [
                'clinicalHistory' => $clinicalHistory,
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

            // Get the PDF content
            $content = $pdf->output();
            $filename = "clinical-history-{$clinicalHistory->patient->identification_number}.pdf";

            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';

            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download laboratory order PDF from a laboratory order using a secure token
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function downloadLaboratoryOrderDirectPdf(Request $request, $id)
    {
        try {
            // Validate token
            if (!$this->validateToken($request, 'laboratory_order_direct', $id)) {
                return response()->json(['error' => 'Invalid or expired token'], 403);
            }

            // Find the laboratory order with related data
            $laboratoryOrder = \App\Models\LaboratoryOrder::with([
                'patient', 
                'order.items.lens.brand', 
                'order.items.lens.material', 
                'order.items.lens.treatment',
                'order.items.lens.lensType',
                'order.appointment.prescription',
                'laboratory',
                'createdBy'
            ])->findOrFail($id);

            // Check if laboratory order has a laboratory assigned
            if (!$laboratoryOrder->laboratory) {
                return response()->json(['error' => 'No laboratory assigned to this laboratory order'], 400);
            }

            // Generate the PDF
            $pdf = PDF::loadView('pdfs.laboratory_order', [
                'order' => $laboratoryOrder->order,
                'laboratory_order' => $laboratoryOrder,
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

            // Get the PDF content
            $content = $pdf->output();
            $filename = "laboratory-order-{$laboratoryOrder->order_number}.pdf";

            // Check if this is a preview request
            $isPreview = $request->has('preview') && $request->preview === 'true';
            
            // For preview, use inline disposition to display in browser
            $disposition = $isPreview ? 'inline' : 'attachment';

            // Return with appropriate headers based on preview or download
            return response($content)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', $disposition . '; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('Error generating guest PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate a secure token for accessing PDFs without authentication
     *
     * @param string $type - The type of document ('order', 'laboratory_order', 'sale', 'clinical_history')
     * @param int $id - The ID of the document
     * @param int $expiryMinutes - How long the token should be valid (default 60 minutes)
     * @return string
     */
    public static function generateToken($type, $id, $expiryMinutes = 60)
    {
        $tokenData = [
            'type' => $type,
            'id' => $id,
            'expires' => now()->addMinutes($expiryMinutes)->timestamp,
        ];
        
        return Crypt::encrypt(json_encode($tokenData));
    }

    /**
     * Validate the provided token for the specified resource
     *
     * @param Request $request
     * @param string $expectedType
     * @param int $expectedId
     * @return bool
     */
    private function validateToken(Request $request, $expectedType, $expectedId)
    {
        try {
            if (!$request->has('token')) {
                return false;
            }
            
            // Decrypt the token
            $tokenData = json_decode(Crypt::decrypt($request->token), true);
            
            // Check if token contains required data
            if (!isset($tokenData['type']) || !isset($tokenData['id']) || !isset($tokenData['expires'])) {
                return false;
            }
            
            // Check token expiry
            $expiryTime = Carbon::createFromTimestamp($tokenData['expires']);
            if (now()->gt($expiryTime)) {
                return false;
            }
            
            // Validate token is for the correct resource
            return $tokenData['type'] === $expectedType && (int)$tokenData['id'] === (int)$expectedId;
            
        } catch (\Exception $e) {
            Log::error('Token validation error: ' . $e->getMessage());
            return false;
        }
    }
} 