<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Historia Clínica - {{ $clinicalHistory->patient->full_name }}</title>
    <style>
        body {
            font-family: 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }
        .logo {
            max-width: 180px;
            max-height: 60px;
        }
        h1 {
            font-size: 22px;
            color: #2c5282;
            margin-bottom: 5px;
        }
        h2 {
            font-size: 16px;
            color: #2c5282;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
        }
        h3 {
            font-size: 14px;
            color: #4a5568;
            margin-top: 15px;
            margin-bottom: 5px;
        }
        .patient-info {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .patient-info p {
            margin: 5px 0;
        }
        .section {
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        table, th, td {
            border: 1px solid #e2e8f0;
        }
        th, td {
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
            font-weight: bold;
        }
        .evolution {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f8fafc;
            border-radius: 5px;
            border-left: 4px solid #4299e1;
        }
        .evolution-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #718096;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>HISTORIA CLÍNICA OPTOMÉTRICA</h1>
        <p>Fecha de impresión: {{ $date }} {{ $time }}</p>
    </div>

    <div class="patient-info">
        <h2>Información del Paciente</h2>
        <table>
            <tr>
                <th>Nombre completo:</th>
                <td>{{ $clinicalHistory->patient->full_name }}</td>
                <th>Documento:</th>
                <td>{{ $clinicalHistory->patient->identification_type }} {{ $clinicalHistory->patient->identification_number }}</td>
            </tr>
            <tr>
                <th>Fecha de nacimiento:</th>
                <td>{{ \Carbon\Carbon::parse($clinicalHistory->patient->birth_date)->format('d/m/Y') }} ({{ \Carbon\Carbon::parse($clinicalHistory->patient->birth_date)->age }} años)</td>
                <th>Género:</th>
                <td>{{ $clinicalHistory->patient->gender }}</td>
            </tr>
            <tr>
                <th>Teléfono:</th>
                <td>{{ $clinicalHistory->patient->phone }}</td>
                <th>Email:</th>
                <td>{{ $clinicalHistory->patient->email }}</td>
            </tr>
            <tr>
                <th>Dirección:</th>
                <td colspan="3">{{ $clinicalHistory->patient->address }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Historia Clínica Base</h2>
        <h3>Datos Generales</h3>
        <table>
            <tr>
                <th>Motivo de Consulta:</th>
                <td>{{ $clinicalHistory->reason_for_consultation }}</td>
            </tr>
            <tr>
                <th>Enfermedad Actual:</th>
                <td>{{ $clinicalHistory->current_illness ?: 'No registrada' }}</td>
            </tr>
            <tr>
                <th>Fecha de creación:</th>
                <td>{{ \Carbon\Carbon::parse($clinicalHistory->created_at)->format('d/m/Y') }}</td>
            </tr>
            <tr>
                <th>Especialista:</th>
                <td>{{ $clinicalHistory->creator->name }}</td>
            </tr>
        </table>

        <h3>Antecedentes</h3>
        <table>
            <tr>
                <th>Personales:</th>
                <td>{{ $clinicalHistory->personal_history ?: 'No registrados' }}</td>
            </tr>
            <tr>
                <th>Familiares:</th>
                <td>{{ $clinicalHistory->family_history ?: 'No registrados' }}</td>
            </tr>
            <tr>
                <th>Ocupacionales:</th>
                <td>{{ $clinicalHistory->occupational_history ?: 'No registrados' }}</td>
            </tr>
        </table>

        <h3>Antecedentes Visuales</h3>
        <table>
            <tr>
                <th>Usa corrección óptica:</th>
                <td>{{ $clinicalHistory->uses_optical_correction ? 'Sí' : 'No' }}</td>
            </tr>
            @if($clinicalHistory->uses_optical_correction)
            <tr>
                <th>Tipo de corrección:</th>
                <td>{{ $clinicalHistory->optical_correction_type ?: 'No especificado' }}</td>
            </tr>
            @endif
            <tr>
                <th>Último control:</th>
                <td>{{ $clinicalHistory->last_control_detail ?: 'No registrado' }}</td>
            </tr>
            <tr>
                <th>Diagnóstico oftalmológico previo:</th>
                <td>{{ $clinicalHistory->ophthalmological_diagnosis ?: 'No registrado' }}</td>
            </tr>
            <tr>
                <th>Cirugía ocular:</th>
                <td>{{ $clinicalHistory->eye_surgery ?: 'No registrada' }}</td>
            </tr>
        </table>

        <h3>Información Médica</h3>
        <table>
            <tr>
                <th>Enfermedad sistémica:</th>
                <td>{{ $clinicalHistory->has_systemic_disease ? 'Sí' : 'No' }}</td>
            </tr>
            @if($clinicalHistory->has_systemic_disease)
            <tr>
                <th>Detalle:</th>
                <td>{{ $clinicalHistory->systemic_disease_detail ?: 'No especificado' }}</td>
            </tr>
            @endif
            <tr>
                <th>Medicamentos:</th>
                <td>{{ $clinicalHistory->medications ?: 'No registrados' }}</td>
            </tr>
            <tr>
                <th>Alergias:</th>
                <td>{{ $clinicalHistory->allergies ?: 'No registradas' }}</td>
            </tr>
        </table>

        <h3>Diagnóstico y Plan de Tratamiento</h3>
        <table>
            <tr>
                <th>Diagnóstico:</th>
                <td>{{ $clinicalHistory->diagnostic ?: 'No registrado' }}</td>
            </tr>
            <tr>
                <th>Plan de tratamiento:</th>
                <td>{{ $clinicalHistory->treatment_plan ?: 'No registrado' }}</td>
            </tr>
            <tr>
                <th>Observaciones:</th>
                <td>{{ $clinicalHistory->observations ?: 'No registradas' }}</td>
            </tr>
        </table>
    </div>

    @if(count($clinicalHistory->evolutions) > 0)
    <div class="page-break"></div>
    <div class="section">
        <h2>Evoluciones Clínicas</h2>
        
        @foreach($clinicalHistory->evolutions as $evolution)
        <div class="evolution">
            <div class="evolution-header">
                <span>Fecha: {{ \Carbon\Carbon::parse($evolution->evolution_date)->format('d/m/Y') }}</span>
                <span>Especialista: {{ $evolution->creator->name }}</span>
            </div>
            
            <h3>SOAP</h3>
            <table>
                <tr>
                    <th>S - Subjetivo:</th>
                    <td>{{ $evolution->subjective }}</td>
                </tr>
                <tr>
                    <th>O - Objetivo:</th>
                    <td>{{ $evolution->objective }}</td>
                </tr>
                <tr>
                    <th>A - Evaluación/Diagnóstico:</th>
                    <td>{{ $evolution->assessment }}</td>
                </tr>
                <tr>
                    <th>P - Plan:</th>
                    <td>{{ $evolution->plan }}</td>
                </tr>
                @if($evolution->recommendations)
                <tr>
                    <th>Recomendaciones:</th>
                    <td>{{ $evolution->recommendations }}</td>
                </tr>
                @endif
            </table>
            
            <h3>Mediciones</h3>
            <table>
                <tr>
                    <th colspan="2">Agudeza Visual</th>
                    <th colspan="2">Fórmula</th>
                </tr>
                <tr>
                    <th>OD Visión Lejana:</th>
                    <td>{{ $evolution->right_far_vision ?: '-' }}</td>
                    <th>OD Esfera:</th>
                    <td>{{ $evolution->right_eye_sphere ?: '-' }}</td>
                </tr>
                <tr>
                    <th>OI Visión Lejana:</th>
                    <td>{{ $evolution->left_far_vision ?: '-' }}</td>
                    <th>OD Cilindro:</th>
                    <td>{{ $evolution->right_eye_cylinder ?: '-' }}</td>
                </tr>
                <tr>
                    <th>OD Visión Cercana:</th>
                    <td>{{ $evolution->right_near_vision ?: '-' }}</td>
                    <th>OD Eje:</th>
                    <td>{{ $evolution->right_eye_axis ?: '-' }}</td>
                </tr>
                <tr>
                    <th>OI Visión Cercana:</th>
                    <td>{{ $evolution->left_near_vision ?: '-' }}</td>
                    <th>OD Agudeza Visual:</th>
                    <td>{{ $evolution->right_eye_visual_acuity ?: '-' }}</td>
                </tr>
                <tr>
                    <th colspan="2"></th>
                    <th>OI Esfera:</th>
                    <td>{{ $evolution->left_eye_sphere ?: '-' }}</td>
                </tr>
                <tr>
                    <th colspan="2"></th>
                    <th>OI Cilindro:</th>
                    <td>{{ $evolution->left_eye_cylinder ?: '-' }}</td>
                </tr>
                <tr>
                    <th colspan="2"></th>
                    <th>OI Eje:</th>
                    <td>{{ $evolution->left_eye_axis ?: '-' }}</td>
                </tr>
                <tr>
                    <th colspan="2"></th>
                    <th>OI Agudeza Visual:</th>
                    <td>{{ $evolution->left_eye_visual_acuity ?: '-' }}</td>
                </tr>
            </table>
        </div>
        @endforeach
    </div>
    @endif

    <div class="footer">
        <p>Este documento forma parte de la historia clínica y está sujeto a reserva. La información contenida es confidencial y solo puede ser conocida por el paciente o personal autorizado.</p>
        <p>CONVISION &copy; {{ date('Y') }}</p>
    </div>
</body>
</html> 