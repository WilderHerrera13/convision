<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\IdentificationType;
use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    /**
     * The name of the corresponding model.
     *
     * @var string
     */
    protected $model = Patient::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
            'email' => $this->faker->unique()->safeEmail,
            'phone' => $this->faker->phoneNumber,
            'birth_date' => $this->faker->date,
            'identification' => $this->faker->unique()->numerify('##########'),
            'identification_type_id' => IdentificationType::factory(), // Use factory to create a valid ID
            'gender' => $this->faker->randomElement(['male', 'female', 'other']), // Use correct enum values
            // Add other patient attributes here
        ];
    }
} 