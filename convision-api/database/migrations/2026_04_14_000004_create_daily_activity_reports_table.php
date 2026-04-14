<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDailyActivityReportsTable extends Migration
{
    public function up()
    {
        Schema::create('daily_activity_reports', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->date('report_date');
            $table->enum('shift', ['morning', 'afternoon', 'full']);

            // Métricas de atención
            $table->integer('preguntas_hombre')->default(0);
            $table->integer('preguntas_mujeres')->default(0);
            $table->integer('preguntas_ninos')->default(0);
            $table->integer('cotizaciones_hombre')->default(0);
            $table->integer('cotizaciones_mujeres')->default(0);
            $table->integer('cotizaciones_ninos')->default(0);
            $table->integer('consultas_efectivas_hombre')->default(0);
            $table->integer('consultas_efectivas_mujeres')->default(0);
            $table->integer('consultas_efectivas_ninos')->default(0);
            $table->integer('consulta_venta_formula')->default(0);
            $table->integer('consultas_no_efectivas')->default(0);

            // Operaciones
            $table->integer('bonos_entregados')->default(0);
            $table->integer('bonos_redimidos')->default(0);
            $table->integer('sistecreditos_realizados')->default(0);
            $table->integer('addi_realizados')->default(0);
            $table->integer('seguimiento_garantias')->default(0);
            $table->integer('ordenes')->default(0);
            $table->integer('plan_separe')->default(0);
            $table->integer('otras_ventas')->default(0);
            $table->integer('entregas')->default(0);
            $table->integer('sistecreditos_abonos')->default(0);
            $table->decimal('valor_ordenes', 15, 2)->default(0);

            // Redes sociales
            $table->integer('publicaciones_facebook')->default(0);
            $table->integer('publicaciones_instagram')->default(0);
            $table->integer('publicaciones_whatsapp')->default(0);
            $table->integer('publicaciones_compartidas_fb')->default(0);
            $table->integer('tiktok_realizados')->default(0);
            $table->integer('bonos_regalo_enviados')->default(0);
            $table->integer('bonos_fidelizacion_enviados')->default(0);
            $table->integer('mensajes_facebook')->default(0);
            $table->integer('mensajes_instagram')->default(0);
            $table->integer('mensajes_whatsapp')->default(0);
            $table->integer('entregas_realizadas')->default(0);
            $table->integer('etiquetas_clientes')->default(0);
            $table->integer('cotizaciones_trabajo')->default(0);
            $table->integer('ordenes_trabajo')->default(0);

            // Control
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'report_date', 'shift']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('daily_activity_reports');
    }
}
