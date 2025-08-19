<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Cotización: {{ $quote->quote_number }}</title>
    <style>
        @page {
            margin: 0cm 0cm;
            size: a4 portrait;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        .invoice-container { /* Renamed to document-container for generality */
            position: relative;
            width: 100%;
            height: 100%;
        }
        /* Modern subtle background pattern */
        .background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }
        .pattern {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.02;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.7'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        /* Modern top accent */
        .top-accent {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 12px;
            background: linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
        }
        .content {
            padding: 30px 30px 60px 30px;
            position: relative;
            z-index: 1;
        }
        /* Modern header with improved spacing */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(59, 130, 246, 0.2);
        }
        .logo-section {
            display: flex;
            flex-direction: column;
            margin-top: 15px;
        }
        .company-logo { /* Assuming you have a logo, if not, this can be removed or replaced */
            height: 60px;
            margin-bottom: 8px;
            /* src: url('path/to/your/logo.png'); */ /* Add your logo path here */
        }
        .company-name {
            font-size: 28px;
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 4px;
            letter-spacing: -0.5px;
        }
        .company-tagline {
            font-size: 13px;
            color: #64748b;
            font-style: italic;
        }
        .company-info {
            margin-top: 8px;
            font-size: 12px;
            color: #64748b;
            line-height: 1.4;
        }
        /* quote information with enhanced design - renamed from invoice-info */
        .document-info {
            text-align: right;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        .document-title { /* Renamed from invoice-title */
            font-size: 24px;
            color: #2563eb;
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .document-number { /* Renamed from invoice-number */
            color: #334155;
            font-size: 15px;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .document-date { /* Renamed from invoice-date */
            color: #64748b;
            font-size: 13px;
            margin-bottom: 3px;
        }
        .document-meta { /* Renamed from invoice-meta */
            color: #64748b;
            font-size: 12px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #e2e8f0;
        }
        /* Improved two-column layout */
        .main-content {
            display: flex;
            margin-bottom: 25px;
            gap: 25px;
        }
        .left-column {
            flex: 2;
        }
        .right-column { /* This column might be used for terms or notes in a quote */
            flex: 1;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        /* Enhanced section styling */
        .section {
            margin-bottom: 25px;
            padding-bottom: 5px;
        }
        .section-title {
            color: #2563eb;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            font-weight: 600;
        }
        /* Client details with updated layout */
        .client-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        .client-item {
            margin-bottom: 5px;
            display: flex;
            flex-direction: column;
        }
        .client-item-icon {
            display: inline-flex;
            align-items: center;
            margin-bottom: 4px;
        }
        .client-item-icon svg {
            width: 14px;
            height: 14px;
            margin-right: 5px;
            color: #3b82f6;
        }
        .label {
            color: #64748b;
            font-size: 12px;
            display: block;
            margin-bottom: 2px;
            font-weight: 500;
        }
        .value {
            color: #334155;
            font-size: 13px;
            font-weight: 500;
        }
        /* Improved table styling */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        thead {
            background-color: #2563eb;
            color: white;
        }
        th {
            text-align: left;
            padding: 10px 12px;
            font-weight: 500;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }
        tbody tr:last-child td {
            border-bottom: none;
        }
        .text-right {
            text-align: right;
        }
        /* Enhanced summary section */
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        .summary-label {
            color: #64748b;
            font-weight: 500;
            font-size: 13px;
        }
        .summary-value {
            font-weight: 600;
            font-size: 13px;
        }
        .total-row {
            border-top: 2px solid #2563eb;
            border-bottom: 2px solid #2563eb;
            font-weight: 700;
            color: #2563eb;
            font-size: 16px; /* Made total a bit larger */
            padding: 10px 0;
        }
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            padding: 20px 30px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            background-color: #f8fafc;
        }
        .footer p {
            margin: 0 0 5px 0;
        }
        .expiration-note { /* Added styling for expiration note */
            margin-top: 20px;
            padding: 12px;
            border: 1px dashed #60a5fa;
            background-color: #eff6ff;
            border-radius: 6px;
            font-size: 12px;
            color: #1e3a8a;
            text-align: center;
        }
        .notes-section { /* Styling for additional notes */
            margin-top: 25px;
        }
        .align-right { text-align: right; }
        .item-description small { font-size: 11px; color: #4b5563; }
    </style>
</head>
<body>
    <div class="document-container">
        <div class="background"><div class="pattern"></div></div>
        <div class="top-accent"></div>

        <div class="content">
            <div class="header">
                <div class="logo-section">
                    <!-- If you have a logo, uncomment and set the src -->
                    <!-- <img src="{{ asset('path/to/your/logo.png') }}" alt="Logo" class="company-logo"> -->
                    <div class="company-name">CONVISION</div>
                    <div class="company-tagline">Tu Visión, Nuestro Compromiso</div>
                    <div class="company-info">
                        Dirección: Av. Ejemplo 123, Ciudad Ejemplo<br>
                        Teléfono: (123) 456-7890 | Email: info@convision.com<br>
                        NIT: 900.123.456-7
                    </div>
                </div>
                <div class="document-info">
                    <div class="document-title">Cotización</div>
                    <div class="document-number"><strong>Número:</strong> {{ $quote->quote_number }}</div>
                    <div class="document-date"><strong>Fecha:</strong> {{ \Carbon\Carbon::parse($quote->created_at)->format('d/m/Y') }}</div>
                    <div class="document-date"><strong>Válida Hasta:</strong> {{ \Carbon\Carbon::parse($quote->expiration_date)->format('d/m/Y') }}</div>
                    <div class="document-meta">
                        <strong>Estado:</strong> 
                        @if($quote->status == \App\Models\Quote::STATUS_PENDING) Pendiente
                        @elseif($quote->status == \App\Models\Quote::STATUS_APPROVED) Aprobada
                        @elseif($quote->status == \App\Models\Quote::STATUS_REJECTED) Rechazada
                        @elseif($quote->status == \App\Models\Quote::STATUS_EXPIRED) Expirada
                        @elseif($quote->status == \App\Models\Quote::STATUS_CONVERTED) Convertida a Venta
                        @else {{ ucfirst($quote->status) }}
                        @endif
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Información del Cliente</div>
                <div class="client-details">
                    <div class="client-item">
                        <span class="label">Nombre:</span>
                        <span class="value">{{ $quote->patient->first_name }} {{ $quote->patient->last_name }}</span>
                    </div>
                    <div class="client-item">
                        <span class="label">Identificación:</span>
                        <span class="value">{{ $quote->patient->identification_type }}: {{ $quote->patient->identification }}</span>
                    </div>
                    @if($quote->patient->email)
                    <div class="client-item">
                        <span class="label">Email:</span>
                        <span class="value">{{ $quote->patient->email }}</span>
                    </div>
                    @endif
                    @if($quote->patient->phone)
                    <div class="client-item">
                        <span class="label">Teléfono:</span>
                        <span class="value">{{ $quote->patient->phone }}</span>
                    </div>
                    @endif
                    @if($quote->patient->address)
                    <div class="client-item">
                        <span class="label">Dirección:</span>
                        <span class="value">{{ $quote->patient->address }}</span>
                    </div>
                    @endif
                </div>
            </div>

            <div class="section">
                <div class="section-title">Detalle de Productos/Servicios</div>
                <table>
                    <thead>
                        <tr>
                            <th>Producto/Servicio</th>
                            <th>Descripción</th>
                            <th class="align-right">Cant.</th>
                            <th class="align-right">Precio Unit.</th>
                            <th class="align-right">Desc. (%)</th>
                            <th class="align-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($quote->items as $item)
                            <tr>
                                <td>{{ $item->name ?: ($item->product ? $item->product->identifier : 'N/A') }}</td>
                                <td class="item-description">
                                    {!! nl2br(e($item->description ?: ($item->product ? $item->product->description : ''))) !!}
                                    @if($item->product && $item->product->brand)
                                        <br><small>Marca: {{ $item->product->brand->name }}</small>
                                    @endif
                                     @if($item->notes)
                                        <br><small><i>Nota: {{ $item->notes }}</i></small>
                                    @endif
                                </td>
                                <td class="align-right">{{ $item->quantity }}</td>
                                <td class="align-right">${{ number_format($item->original_price ?: $item->price, 2) }}</td>
                                <td class="align-right">{{ number_format($item->discount_percentage ?: 0, 2) }}%</td>
                                <td class="align-right">${{ number_format($item->total, 2) }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 20px;">No hay productos o servicios en esta cotización.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <div style="clear: both;"></div>

            <div class="main-content" style="margin-top: 20px;">
                <div class="left-column">
                    @if($quote->notes)
                    <div class="notes-section">
                        <div class="section-title">Notas Adicionales</div>
                        <p>{!! nl2br(e($quote->notes)) !!}</p>
                    </div>
                    @endif

                    <div class="expiration-note">
                        Esta cotización es válida hasta el {{ \Carbon\Carbon::parse($quote->expiration_date)->format('d \\d\\e F \\d\\e Y') }}. <br>Precios y disponibilidad pueden variar después de esta fecha.
                    </div>
                </div>

                <div class="right-column">
                    <div class="section-title">Resumen Financiero</div>
                    <div class="summary-row">
                        <span class="summary-label">Subtotal:</span>
                        <span class="summary-value">${{ number_format($quote->subtotal, 2) }}</span>
                    </div>
                     @if($quote->discount_amount > 0)
                    <div class="summary-row">
                        <span class="summary-label">Descuento Global:</span>
                        <span class="summary-value">-${{ number_format($quote->discount_amount, 2) }}</span>
                    </div>
                    @endif
                    <div class="summary-row">
                        <span class="summary-label">Impuestos ({{ number_format(($quote->tax_percentage ?: 0), 0) }}%):</span> {{-- Assuming tax_percentage is available --}}
                        <span class="summary-value">${{ number_format($quote->tax_amount, 2) }}</span>
                    </div>
                    <div class="total-row summary-row">
                        <span class="summary-label" style="color: #2563eb;">TOTAL A PAGAR:</span>
                        <span class="summary-value" style="color: #2563eb;">${{ number_format($quote->total, 2) }}</span>
                    </div>
                </div>
            </div>
            
            <!-- This section is for payment details, usually not on a quote, can be removed or adapted -->
            {{-- 
            @if($quote->payments && $quote->payments->count() > 0)
            <div class="section" style="margin-top: 30px;">
                <div class="section-title">Historial de Pagos</div>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Método de Pago</th>
                            <th class="align-right">Monto Pagado</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($quote->payments as $payment)
                        <tr>
                            <td>{{ \Carbon\Carbon::parse($payment->payment_date)->format('d/m/Y') }}</td>
                            <td>{{ $payment->paymentMethod ? $payment->paymentMethod->name : 'N/A' }}</td>
                            <td class="align-right">${{ number_format($payment->amount, 2) }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @endif
            --}}

        </div>

        <div class="footer">
            <p>Gracias por su interés. Para cualquier consulta, no dude en contactarnos.</p>
            <p>Documento generado el {{ $date }} a las {{ $time }}. CONVISION &copy; {{ date('Y') }}</p>
        </div>
    </div>
</body>
</html> 