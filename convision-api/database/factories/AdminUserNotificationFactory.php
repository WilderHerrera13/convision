<?php

namespace Database\Factories;

use App\Models\AdminUserNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AdminUserNotificationFactory extends Factory
{
    protected $model = AdminUserNotification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state([
                'role' => User::ROLE_ADMIN,
                'last_name' => 'Test',
            ]),
            'title' => $this->faker->sentence(6),
            'body' => $this->faker->paragraph(),
            'kind' => $this->faker->randomElement([
                AdminUserNotification::KIND_SYSTEM,
                AdminUserNotification::KIND_OPERATIONAL,
                AdminUserNotification::KIND_MESSAGE,
            ]),
            'action_url' => null,
            'read_at' => null,
            'archived_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn () => ['read_at' => now()]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['archived_at' => now()]);
    }
}
