<?php

namespace App\Observers;

use App\Models\Prescription;
use App\Models\Appointment;

class PrescriptionObserver
{
    /**
     * Handle the Prescription "created" event.
     *
     * @param  \App\Models\Prescription  $prescription
     * @return void
     */
    public function created(Prescription $prescription)
    {
        // Find the related appointment
        $appointment = Appointment::find($prescription->appointment_id);
        
        if ($appointment) {
            // Update the appointment status to completed
            $appointment->status = 'completed';
            $appointment->save();
        }
    }

    /**
     * Handle the Prescription "updated" event.
     *
     * @param  \App\Models\Prescription  $prescription
     * @return void
     */
    public function updated(Prescription $prescription)
    {
        //
    }

    /**
     * Handle the Prescription "deleted" event.
     *
     * @param  \App\Models\Prescription  $prescription
     * @return void
     */
    public function deleted(Prescription $prescription)
    {
        //
    }

    /**
     * Handle the Prescription "restored" event.
     *
     * @param  \App\Models\Prescription  $prescription
     * @return void
     */
    public function restored(Prescription $prescription)
    {
        //
    }

    /**
     * Handle the Prescription "force deleted" event.
     *
     * @param  \App\Models\Prescription  $prescription
     * @return void
     */
    public function forceDeleted(Prescription $prescription)
    {
        //
    }
} 