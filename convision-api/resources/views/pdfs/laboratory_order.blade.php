<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laboratory Order #{{ $order->order_number }}</title>
    <style>
        body {
            font-family: 'Helvetica', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #003366;
            padding-bottom: 10px;
        }
        .header h1 {
            color: #003366;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            background-color: #003366;
            color: white;
            padding: 5px 10px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .info-box {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
        }
        .info-box h3 {
            margin-top: 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            font-size: 14px;
            color: #003366;
        }
        .info-item {
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: bold;
            display: inline-block;
            width: 120px;
        }
        .prescription-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .prescription-table th, .prescription-table td {
            border: 1px solid #ddd;
            padding: 5px;
            text-align: center;
        }
        .prescription-table th {
            background-color: #f2f2f2;
        }
        .lens-items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .lens-items th, .lens-items td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .lens-items th {
            background-color: #f2f2f2;
        }
        .footer {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 40px;
        }
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LABORATORY WORK ORDER</h1>
        <p>Order #: {{ $order->order_number }} | Date: {{ $date }} | Time: {{ $time }}</p>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <h3>Laboratory Information</h3>
            <div class="info-item">
                <span class="info-label">Name:</span>
                <span>{{ $order->laboratory->name }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Contact:</span>
                <span>{{ $order->laboratory->contact_person ?? 'N/A' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone:</span>
                <span>{{ $order->laboratory->phone ?? 'N/A' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email:</span>
                <span>{{ $order->laboratory->email ?? 'N/A' }}</span>
            </div>
        </div>

        <div class="info-box">
            <h3>Patient Information</h3>
            <div class="info-item">
                <span class="info-label">Patient:</span>
                <span>{{ $order->patient->name }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone:</span>
                <span>{{ $order->patient->phone ?? 'N/A' }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email:</span>
                <span>{{ $order->patient->email ?? 'N/A' }}</span>
            </div>
        </div>
    </div>

    @if($order->appointment && $order->appointment->prescription)
    <div class="section">
        <div class="section-title">Prescription Details</div>
        <table class="prescription-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Sphere</th>
                    <th>Cylinder</th>
                    <th>Axis</th>
                    <th>Add</th>
                    <th>PD</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Right Eye (OD)</strong></td>
                    <td>{{ $order->appointment->prescription->sphere_right }}</td>
                    <td>{{ $order->appointment->prescription->cylinder_right }}</td>
                    <td>{{ $order->appointment->prescription->axis_right }}</td>
                    <td>{{ $order->appointment->prescription->add_right }}</td>
                    <td>{{ $order->appointment->prescription->pd_right }}</td>
                </tr>
                <tr>
                    <td><strong>Left Eye (OS)</strong></td>
                    <td>{{ $order->appointment->prescription->sphere_left }}</td>
                    <td>{{ $order->appointment->prescription->cylinder_left }}</td>
                    <td>{{ $order->appointment->prescription->axis_left }}</td>
                    <td>{{ $order->appointment->prescription->add_left }}</td>
                    <td>{{ $order->appointment->prescription->pd_left }}</td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 10px;">
            <span class="info-label">Doctor's Notes:</span>
            <span>{{ $order->appointment->prescription->notes ?? 'N/A' }}</span>
        </div>
    </div>
    @endif

    <div class="section">
        <div class="section-title">Lens Details</div>
        <table class="lens-items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Brand</th>
                    <th>Material</th>
                    <th>Type</th>
                    <th>Treatment</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $item)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td>{{ $item->lens->description }}</td>
                    <td>{{ $item->lens->brand->name ?? 'N/A' }}</td>
                    <td>{{ $item->lens->material->name ?? 'N/A' }}</td>
                    <td>{{ $item->lens->lensType->name ?? 'N/A' }}</td>
                    <td>{{ $item->lens->treatment->name ?? 'N/A' }}</td>
                    <td>{{ $item->quantity }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Special Instructions</div>
        <div style="padding: 10px; border: 1px solid #ddd; min-height: 80px; border-radius: 5px;">
            {{ $order->notes ?? 'No special instructions provided.' }}
        </div>
    </div>

    <div class="signatures">
        <div class="signature-line">
            Optician Signature
        </div>
        <div class="signature-line">
            Laboratory Receipt
        </div>
    </div>

    <div class="footer">
        <p>This is a laboratory work order for lens manufacturing. Please process according to the specifications above.</p>
        <p>Order generated by {{ $order->createdBy->name }} on {{ $date }} at {{ $time }}</p>
    </div>
</body>
</html> 