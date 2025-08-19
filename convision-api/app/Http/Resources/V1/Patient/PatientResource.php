<?php

namespace App\Http\Resources\V1\Patient;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'identification' => $this->identification,
            'identification_type' => $this->identification_type,
            'birth_date' => $this->birth_date,
            'gender' => $this->gender,
            'address' => $this->address,
            'city' => $this->city,
            'district' => $this->district,
            'state' => $this->state,
            'country' => $this->country,
            'neighborhood' => $this->neighborhood,
            'postal_code' => $this->postal_code,
            'eps' => $this->eps,
            'affiliation' => $this->affiliation,
            'coverage' => $this->coverage,
            'occupation' => $this->occupation,
            'education' => $this->education,
            'position' => $this->position,
            'company' => $this->company,
            'notes' => $this->notes,
            'status' => $this->status,
            'profile_image_url' => $this->profile_image_url,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 