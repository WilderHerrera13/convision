<?php

namespace App\Exceptions;

use Exception;

class AppointmentInProgressException extends Exception
{
    public $currentAppointmentId;

    public function __construct($message = 'Ya tienes una cita en progreso. Debes completar o pausar la cita actual antes de tomar otra.', $currentAppointmentId = null, $code = 0, Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->currentAppointmentId = $currentAppointmentId;
    }

    public function render($request)
    {
        return response()->json([
            'message' => $this->getMessage(),
            'current_appointment_id' => $this->currentAppointmentId,
            'error_type' => 'appointment_in_progress'
        ], 422);
    }
} 