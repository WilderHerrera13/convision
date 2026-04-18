<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('service_orders', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('supplier_id');
            }
            if (!Schema::hasColumn('service_orders', 'customer_phone')) {
                $table->string('customer_phone')->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('service_orders', 'customer_email')) {
                $table->string('customer_email')->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('service_orders', 'priority')) {
                $table->enum('priority', ['low','medium','high'])->default('medium')->after('estimated_delivery_date');
            }
            if (!Schema::hasColumn('service_orders', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
        });

        // Ampliar status para incluir 'delivered'
        try {
            $driver = DB::getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE service_orders MODIFY COLUMN status ENUM('pending','in_progress','completed','delivered','cancelled') NOT NULL DEFAULT 'pending'");
            } elseif ($driver === 'pgsql') {
                DB::statement('ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check');
                DB::statement("ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check CHECK (status IN ('pending','in_progress','completed','delivered','cancelled'))");
            }
        } catch (\Throwable $e) {
            // Ignorar si el motor de BD no soporta esta operación
        }
    }

    public function down(): void
    {
        // Revertir enum change
        try {
            $driver = DB::getDriverName();
            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE service_orders MODIFY COLUMN status ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending'");
            } elseif ($driver === 'pgsql') {
                DB::statement('ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check');
                DB::statement("ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check CHECK (status IN ('pending','in_progress','completed','cancelled'))");
            }
        } catch (\Throwable $e) {
        }

        Schema::table('service_orders', function (Blueprint $table) {
            if (Schema::hasColumn('service_orders', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('service_orders', 'priority')) {
                $table->dropColumn('priority');
            }
            if (Schema::hasColumn('service_orders', 'customer_email')) {
                $table->dropColumn('customer_email');
            }
            if (Schema::hasColumn('service_orders', 'customer_phone')) {
                $table->dropColumn('customer_phone');
            }
            if (Schema::hasColumn('service_orders', 'customer_name')) {
                $table->dropColumn('customer_name');
            }
        });
    }
};


