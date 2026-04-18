<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddTakenByAndInProgressStatusToAppointmentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedBigInteger('taken_by_id')->nullable();
            $table->foreign('taken_by_id')->references('id')->on('users')->onDelete('set null');
        });

        // Ampliar los valores válidos de status para incluir 'in_progress'
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled'");
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check');
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['taken_by_id']);
            $table->dropColumn('taken_by_id');
        });

        // Revertir status a valores originales
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled'");
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check');
            DB::statement("ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))");
        }
    }
} 