<?php

namespace Database\Factories;

use App\Models\ClinicalEvolution;
use App\Models\ClinicalHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClinicalEvolutionFactory extends Factory
{
    /**
     * The name of the corresponding model.
     *
     * @var string
     */
    protected $model = ClinicalEvolution::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'clinical_history_id' => ClinicalHistory::factory(),
            'evolution_date' => $this->faker->date,
            'subjective' => $this->faker->paragraph,
            'objective' => $this->faker->paragraph,
            'assessment' => $this->faker->paragraph,
            'plan' => $this->faker->paragraph,
            'recommendations' => $this->faker->paragraph,
            'created_by' => User::factory()->create()->id,
            'updated_by' => User::factory()->create()->id,
            // Add other required fields for ClinicalEvolution
        ];
    }
} 