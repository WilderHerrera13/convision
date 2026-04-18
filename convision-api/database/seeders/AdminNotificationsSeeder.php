<?php

namespace Database\Seeders;

use App\Models\AdminUserNotification;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminNotificationsSeeder extends Seeder
{
    public function run(): void
    {
        $admins = User::query()->where('role', User::ROLE_ADMIN)->get();
        if ($admins->isEmpty()) {
            return;
        }

        foreach ($admins as $admin) {
            if (AdminUserNotification::query()->where('user_id', $admin->id)->exists()) {
                continue;
            }

            $rows = [
                [
                    'title' => 'Reporte mensual listo',
                    'body' => 'El reporte de ventas, consultas y conversión del mes ya está disponible para revisar.',
                    'kind' => AdminUserNotification::KIND_SYSTEM,
                    'action_url' => '/admin/daily-reports',
                ],
                [
                    'title' => 'Rendimiento de la semana',
                    'body' => 'Las métricas de la semana muestran un incremento en citas completadas frente a la anterior.',
                    'kind' => AdminUserNotification::KIND_OPERATIONAL,
                    'action_url' => '/admin/dashboard',
                ],
                [
                    'title' => 'Recordatorio de inventario',
                    'body' => 'Hay productos con stock bajo según el umbral configurado en inventario.',
                    'kind' => AdminUserNotification::KIND_MESSAGE,
                    'action_url' => '/admin/inventory',
                ],
            ];

            foreach ($rows as $i => $row) {
                AdminUserNotification::query()->create([
                    'user_id' => $admin->id,
                    'title' => $row['title'],
                    'body' => $row['body'],
                    'kind' => $row['kind'],
                    'action_url' => $row['action_url'],
                    'read_at' => $i === 0 ? null : now()->subHours(2),
                    'archived_at' => null,
                ]);
            }

            AdminUserNotification::query()->create([
                'user_id' => $admin->id,
                'title' => 'Actualización de política',
                'body' => 'Se archivó automáticamente un aviso anterior de política interna.',
                'kind' => AdminUserNotification::KIND_SYSTEM,
                'action_url' => null,
                'read_at' => now()->subDay(),
                'archived_at' => now()->subHours(6),
            ]);
        }
    }
}
