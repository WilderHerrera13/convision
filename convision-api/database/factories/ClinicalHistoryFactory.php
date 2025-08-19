<?php

namespace Database\Factories;

use App\Models\ClinicalHistory;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClinicalHistoryFactory extends Factory
{
    /**
     * The name of the corresponding model.
     *
     * @var string
     */
    protected $model = ClinicalHistory::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'patient_id' => Patient::factory(),
            'created_by' => User::factory()->create(['role' => 'specialist'])->id,
            'updated_by' => User::factory()->create(['role' => 'specialist'])->id,
            'reason_for_consultation' => $this->faker->sentence,
            'current_illness' => $this->faker->paragraph,
            // Add other required fields for ClinicalHistory
        ];
    }
} 