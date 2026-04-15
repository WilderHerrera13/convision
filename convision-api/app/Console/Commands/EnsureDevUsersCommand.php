<?php

namespace App\Console\Commands;

use Database\Seeders\UsersTableSeeder;
use Illuminate\Console\Command;

/**
 * Recreates the three canonical dev users (admin / specialist / receptionist)
 * when the database was migrated without running seeders — the usual cause of
 * POST /api/v1/auth/login returning 401 with valid documented passwords.
 */
class EnsureDevUsersCommand extends Command
{
    protected $signature = 'convision:ensure-dev-users';

    protected $description = 'Ensure admin@, specialist@, receptionist@convision.com exist with password "password" (dev only)';

    public function handle(): int
    {
        $this->info('Running UsersTableSeeder…');
        $this->call('db:seed', ['--class' => UsersTableSeeder::class, '--force' => true]);
        $this->info('Done. You can log in with the users documented in README / docs/CREDENCIALES_PRUEBA_ROLES.md.');

        return self::SUCCESS;
    }
}
