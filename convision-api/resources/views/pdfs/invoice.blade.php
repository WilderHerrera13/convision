<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Factura: {{ $sale->sale_number }}</title>
    <style>
        @page {
            margin: 20mm;
            size: a4 portrait;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        
        .company-tagline {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .company-details {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
        }
        
        .invoice-meta {
            text-align: right;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .invoice-title {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
        }
        
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .invoice-date {
            font-size: 11px;
            color: #666;
        }
        
        .client-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .client-title {
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .client-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .client-field {
            margin-bottom: 8px;
        }
        
        .field-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        
        .field-value {
            font-size: 12px;
            font-weight: 500;
            color: #1f2937;
        }
        
        .products-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .products-table th {
            background: #2563eb;
            color: white;
            padding: 12px 8px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
        }
        
        .products-table th:last-child {
            text-align: right;
        }
        
        .products-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
        
        .products-table tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .products-table tr:hover {
            background: #f1f5f9;
        }
        
        .product-code {
            font-weight: bold;
            color: #2563eb;
        }
        
        .product-description {
            font-weight: 500;
            color: #1f2937;
            line-height: 1.3;
        }
        
        .product-brand {
            font-size: 10px;
            color: #666;
            margin-bottom: 2px;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .font-bold {
            font-weight: bold;
        }
        
        .amount {
            font-weight: 500;
            color: #1f2937;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .totals-table tr {
            border-bottom: 1px solid #e2e8f0;
        }
        
        .totals-table tr:last-child {
            border-bottom: none;
        }
        
        .totals-table td {
            padding: 10px 15px;
            font-size: 12px;
        }
        
        .totals-table .label {
            background: #f8fafc;
            font-weight: 500;
            color: #374151;
        }
        
        .totals-table .value {
            text-align: right;
            font-weight: bold;
            color: #1f2937;
        }
        
        .total-row {
            background: #2563eb !important;
            color: white !important;
        }
        
        .total-row .label,
        .total-row .value {
            background: #2563eb !important;
            color: white !important;
            font-size: 14px;
            font-weight: bold;
        }
        
        .payment-info {
            background: #ecfdf5;
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .payment-title {
            font-size: 12px;
            font-weight: bold;
            color: #065f46;
            margin-bottom: 8px;
        }
        
        .payment-amount {
            font-size: 14px;
            font-weight: bold;
            color: #059669;
        }
        
        .balance-info {
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .balance-title {
            font-size: 12px;
            font-weight: bold;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .balance-amount {
            font-size: 14px;
            font-weight: bold;
            color: #d97706;
        }
        
        .notes-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
        }
        
        .notes-title {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 8px;
        }
        
        .notes-content {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
        }
        
        .footer {
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            margin-top: 40px;
        }
        
        .footer-company {
            font-size: 14px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        
        .footer-info {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
        }
        
        .footer-contact {
            margin-top: 10px;
            font-size: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="invoice-header">
        <div class="company-info">
            <div class="company-name">CONVISION</div>
            <div class="company-tagline">Soluciones Premium para el Cuidado de la Vista</div>
            <div class="company-details">
                Especialistas en Lentes y Cuidado Ocular<br>
                Bogotá, Colombia<br>
                Tel: (123) 456-7890 | Email: info@convision.com
            </div>
        </div>
        <div class="invoice-meta">
            <div class="invoice-title">FACTURA DE VENTA</div>
            <div class="invoice-number">{{ $sale->sale_number }}</div>
            <div class="invoice-date">
                <strong>Fecha:</strong> {{ date('d/m/Y', strtotime($sale->created_at)) }}<br>
                <strong>Hora:</strong> {{ date('H:i', strtotime($sale->created_at)) }}
            </div>
        </div>
    </div>

    <div class="client-section">
        <div class="client-title">Información del Cliente</div>
        <div class="client-info">
            <div>
                <div class="client-field">
                    <div class="field-label">Nombre Completo</div>
                    <div class="field-value">{{ $sale->patient->first_name }} {{ $sale->patient->last_name }}</div>
                </div>
                <div class="client-field">
                    <div class="field-label">Documento</div>
                    <div class="field-value">{{ $sale->patient->identification ?? 'No registrado' }}</div>
                </div>
            </div>
            <div>
                <div class="client-field">
                    <div class="field-label">Teléfono</div>
                    <div class="field-value">{{ $sale->patient->phone ?? 'No registrado' }}</div>
                </div>
                <div class="client-field">
                    <div class="field-label">Email</div>
                    <div class="field-value">{{ $sale->patient->email ?? 'No registrado' }}</div>
                </div>
            </div>
        </div>
    </div>

    @php
        $hasItems = ($sale->items && $sale->items->count() > 0) || ($sale->order && $sale->order->items->count() > 0);
        $itemsToShow = $sale->items && $sale->items->count() > 0 ? $sale->items : ($sale->order ? $sale->order->items : collect());
    @endphp

    @if($hasItems)
    <div class="products-section">
        <div class="section-title">Productos y Servicios</div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 15%">Código</th>
                    <th style="width: 40%">Descripción</th>
                    <th style="width: 10%" class="text-center">Cantidad</th>
                    <th style="width: 12%" class="text-right">Precio Unit.</th>
                    <th style="width: 12%" class="text-right">Descuento</th>
                    <th style="width: 12%" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($itemsToShow as $item)
                <tr>
                    <td>
                        <span class="product-code">{{ $item->lens->internal_code ?? $item->lens->identifier ?? 'N/A' }}</span>
                    </td>
                    <td>
                        <div class="product-brand">{{ $item->lens->brand->name ?? 'Sin marca' }}</div>
                        <div class="product-description">{{ $item->lens->description }}</div>
                        @if($item->lens->material)
                            <div style="font-size: 9px; color: #666; margin-top: 2px;">
                                Material: {{ $item->lens->material->name }}
                            </div>
                        @endif
                        @if($item->lens->treatment)
                            <div style="font-size: 9px; color: #666;">
                                Tratamiento: {{ $item->lens->treatment->name }}
                            </div>
                        @endif
                    </td>
                    <td class="text-center">
                        <span class="font-bold">{{ $item->quantity }}</span>
                    </td>
                    <td class="text-right">
                        <span class="amount">${{ number_format($item->price, 0, ',', '.') }}</span>
                    </td>
                    <td class="text-right">
                        <span class="amount">${{ number_format($item->discount ?? 0, 0, ',', '.') }}</span>
                    </td>
                    <td class="text-right">
                        <span class="amount font-bold">${{ number_format($item->total, 0, ',', '.') }}</span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <div class="totals-section">
        <table class="totals-table">
            <tr>
                <td class="label">Subtotal:</td>
                <td class="value">${{ number_format($sale->subtotal, 0, ',', '.') }}</td>
            </tr>
            @if($sale->discount > 0)
            <tr>
                <td class="label">Descuento:</td>
                <td class="value">-${{ number_format($sale->discount, 0, ',', '.') }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">IVA (19%):</td>
                <td class="value">${{ number_format($sale->tax, 0, ',', '.') }}</td>
            </tr>
            <tr class="total-row">
                <td class="label">TOTAL:</td>
                <td class="value">${{ number_format($sale->total, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>

    @if($sale->amount_paid > 0)
    <div class="payment-info">
        <div class="payment-title">Abono Realizado</div>
        <div class="payment-amount">${{ number_format($sale->amount_paid, 0, ',', '.') }}</div>
    </div>
    @endif

    @if($sale->balance > 0)
    <div class="balance-info">
        <div class="balance-title">Saldo Pendiente</div>
        <div class="balance-amount">${{ number_format($sale->balance, 0, ',', '.') }}</div>
    </div>
    @endif

    @if($sale->notes)
    <div class="notes-section">
        <div class="notes-title">Observaciones</div>
        <div class="notes-content">{{ $sale->notes }}</div>
    </div>
    @endif

    <div class="footer">
        <div class="footer-company">CONVISION - Soluciones Premium para el Cuidado de la Vista</div>
        <div class="footer-info">
            Esta factura fue generada automáticamente el {{ date('d/m/Y') }} a las {{ date('H:i') }}<br>
            Para consultas sobre esta factura, contacte: info@convision.com | (123) 456-7890
        </div>
        <div class="footer-contact">
            <strong>Factura #{{ $sale->sale_number }}</strong> - Gracias por su confianza
        </div>
    </div>
</body>
</html> 