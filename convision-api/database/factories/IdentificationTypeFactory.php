<?php

namespace Database\Factories;

use App\Models\IdentificationType;
use Illuminate\Database\Eloquent\Factories\Factory;

class IdentificationTypeFactory extends Factory
{
    /**
     * The name of the corresponding model.
     *
     * @var string
     */
    protected $model = IdentificationType::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'name' => $this->faker->unique()->word,
            'code' => $this->faker->unique()->lexify('?????'),
            'is_active' => true,
        ];
    }
} 