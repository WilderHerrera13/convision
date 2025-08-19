<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Order: {{ $order->order_number }}</title>
    <style>
        @page {
            margin: 0cm 0cm;
        }
        body {
            margin-top: 3.5cm;
            margin-left: 2cm;
            margin-right: 2cm;
            margin-bottom: 2cm;
            font-family: Helvetica, Arial, sans-serif;
            color: #2D3748;
            line-height: 1.6;
            font-size: 11pt;
        }
        .header {
            position: fixed;
            top: 0cm;
            left: 0cm;
            right: 0cm;
            height: 3cm;
            background: linear-gradient(135deg, #2B6CB0 0%, #1A365D 100%);
            color: white;
            text-align: center;
            padding-top: 0.7cm;
            border-bottom: 0.05cm solid #2B6CB0;
        }
        .footer {
            position: fixed;
            bottom: 0cm;
            left: 0cm;
            right: 0cm;
            height: 2cm;
            background: #F7FAFC;
            color: #4A5568;
            text-align: center;
            line-height: 1.8cm;
            font-size: 0.9em;
            border-top: 0.05cm solid #E2E8F0;
        }
        .title {
            font-size: 1.8em;
            margin-bottom: 0.8cm;
            color: #2B6CB0;
            text-align: center;
            font-weight: bold;
            padding-bottom: 0.3cm;
            border-bottom: 0.05cm solid #E2E8F0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .subtitle {
            font-size: 1.3em;
            color: #2D3748;
            margin-top: 0.8cm;
            margin-bottom: 0.4cm;
            font-weight: bold;
            background: #EBF4FF;
            padding: 0.3cm 0.5cm;
            border-radius: 0.2cm;
        }
        .info-section {
            margin-bottom: 1cm;
            padding: 0.8cm;
            background-color: #F7FAFC;
            border-radius: 0.3cm;
            border-left: 0.2cm solid #2B6CB0;
            box-shadow: 0 0.1cm 0.2cm rgba(0, 0, 0, 0.05);
        }
        .info-row {
            display: block;
            margin-bottom: 0.3cm;
            padding: 0.2cm 0;
        }
        .info-label {
            font-weight: bold;
            color: #4A5568;
            width: 4.5cm;
            display: inline-block;
        }
        .info-value {
            display: inline-block;
            color: #2D3748;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.8cm 0;
            background: white;
            border-radius: 0.3cm;
            overflow: hidden;
            box-shadow: 0 0.1cm 0.3cm rgba(0, 0, 0, 0.1);
        }
        th {
            background-color: #2B6CB0;
            color: white;
            padding: 0.5cm;
            text-align: left;
            font-weight: bold;
            font-size: 0.95em;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        td {
            padding: 0.4cm 0.5cm;
            border-bottom: 0.01cm solid #E2E8F0;
            font-size: 0.95em;
            color: #4A5568;
        }
        tr:nth-child(even) {
            background-color: #F7FAFC;
        }
        tr:last-child td {
            border-bottom: none;
        }
        .summary-box {
            float: right;
            width: 9cm;
            padding: 0.8cm;
            background-color: #F7FAFC;
            border-radius: 0.3cm;
            border-top: 0.2cm solid #2B6CB0;
            margin-top: 0.8cm;
            box-shadow: 0 0.1cm 0.3cm rgba(0, 0, 0, 0.1);
        }
        .summary-row {
            display: block;
            margin-bottom: 0.3cm;
            padding: 0.2cm 0;
            color: #4A5568;
        }
        .summary-label {
            font-weight: bold;
            width: 4.5cm;
            display: inline-block;
            text-align: left;
        }
        .summary-value {
            display: inline-block;
            text-align: right;
            float: right;
            font-weight: bold;
            color: #2D3748;
        }
        .total-row {
            border-top: 0.1cm solid #2B6CB0;
            padding-top: 0.4cm;
            margin-top: 0.4cm;
            font-size: 1.2em;
            color: #2D3748;
        }
        .status {
            padding: 0.2cm 0.5cm;
            border-radius: 0.2cm;
            font-size: 0.9em;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
            display: inline-block;
            letter-spacing: 0.05em;
        }
        .status-completed {
            background-color: #48BB78;
        }
        .status-paid {
            background-color: #48BB78;
        }
        .prescription-box {
            background-color: #EBF4FF;
            padding: 0.8cm;
            border-radius: 0.3cm;
            margin: 0.8cm 0;
            border-left: 0.2cm solid #2B6CB0;
            box-shadow: 0 0.1cm 0.2cm rgba(0, 0, 0, 0.05);
        }
        .note-box {
            background-color: #F7FAFC;
            padding: 0.8cm;
            border-radius: 0.3cm;
            margin-top: 0.8cm;
            border-left: 0.2cm solid #4A5568;
            box-shadow: 0 0.1cm 0.2cm rgba(0, 0, 0, 0.05);
        }
        .brand-highlight {
            color: #2B6CB0;
            font-weight: bold;
        }
        .company-info {
            text-align: center;
            font-size: 1.1em;
            color: white;
            line-height: 1.4;
        }
        .company-name {
            font-size: 1.8em;
            font-weight: bold;
            margin-bottom: 0.2cm;
        }
        .company-subtitle {
            font-size: 1em;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="company-name">CONVISION</div>
            <div class="company-subtitle">Óptica Profesional</div>
        </div>
    </div>
    
    <div class="footer">
        <div>Convision Óptica Profesional | {{ $date }} {{ $time }}</div>
    </div>
    
    <div class="title">ORDEN DE VENTA #{{ $order->order_number }}</div>
    
    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Fecha:</span>
            <span class="info-value">{{ \Carbon\Carbon::parse($order->created_at)->format('d/m/Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value">
                <div class="status status-completed">Completado</div>
            </span>
        </div>
        <div class="info-row">
            <span class="info-label">Pago:</span>
            <span class="info-value">
                <div class="status status-paid">Pagado</div>
            </span>
        </div>
    </div>
    
    <div class="subtitle">INFORMACIÓN DEL CLIENTE</div>
    
    <div class="info-section">
        <div class="info-row">
            <span class="info-label">Nombre:</span>
            <span class="info-value">{{ $order->patient->first_name }} {{ $order->patient->last_name }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Identificación:</span>
            <span class="info-value">{{ $order->patient->identification }}</span>
        </div>
        @if($order->patient->phone)
        <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">{{ $order->patient->phone }}</span>
        </div>
        @endif
        @if($order->patient->email)
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">{{ $order->patient->email }}</span>
        </div>
        @endif
    </div>

    @if($order->appointment && $order->appointment->prescription)
    <div class="subtitle">PRESCRIPCIÓN</div>
    <div class="prescription-box">
        <table>
            <tr>
                <th></th>
                <th>Esfera</th>
                <th>Cilindro</th>
                <th>Eje</th>
                <th>Add</th>
                <th>DIP</th>
            </tr>
            <tr>
                <td><strong>OD</strong></td>
                <td>{{ $order->appointment->prescription->sphere_right }}</td>
                <td>{{ $order->appointment->prescription->cylinder_right }}</td>
                <td>{{ $order->appointment->prescription->axis_right }}</td>
                <td>{{ $order->appointment->prescription->add_right }}</td>
                <td>{{ $order->appointment->prescription->dip_right }}</td>
            </tr>
            <tr>
                <td><strong>OI</strong></td>
                <td>{{ $order->appointment->prescription->sphere_left }}</td>
                <td>{{ $order->appointment->prescription->cylinder_left }}</td>
                <td>{{ $order->appointment->prescription->axis_left }}</td>
                <td>{{ $order->appointment->prescription->add_left }}</td>
                <td>{{ $order->appointment->prescription->dip_left }}</td>
            </tr>
        </table>
    </div>
    @endif

    <div class="subtitle">PRODUCTOS</div>
    <table>
        <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Descuento</th>
            <th>Total</th>
        </tr>
        @foreach($order->items as $item)
        <tr>
            <td>
                <span class="brand-highlight">{{ $item->lens->brand->name }}</span><br>
                {{ $item->lens->name }}<br>
                <small>Material: {{ $item->lens->material->name }}</small><br>
                <small>Tratamiento: {{ $item->lens->treatment->name }}</small>
            </td>
            <td>{{ $item->quantity }}</td>
            <td>${{ number_format($item->price, 2) }}</td>
            <td>${{ number_format($item->discount, 2) }}</td>
            <td>${{ number_format($item->total, 2) }}</td>
        </tr>
        @endforeach
    </table>

    <div class="summary-box">
        <div class="summary-row">
            <span class="summary-label">Subtotal:</span>
            <span class="summary-value">${{ number_format($order->subtotal, 2) }}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">IVA ({{ $order->tax_rate ?? 12 }}%):</span>
            <span class="summary-value">${{ number_format($order->tax, 2) }}</span>
        </div>
        <div class="summary-row total-row">
            <span class="summary-label">Total:</span>
            <span class="summary-value">${{ number_format($order->total, 2) }}</span>
        </div>
    </div>

    @if($order->notes)
    <div style="clear: both;"></div>
    <div class="subtitle">NOTAS</div>
    <div class="note-box">
        {{ $order->notes }}
    </div>
    @endif
</body>
</html> 