<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('coordinate_elevations')) {
            Schema::create('coordinate_elevations', function (Blueprint $table) {
                $table->id();
                $table->decimal('lat', 10, 6)->index();
                $table->decimal('lng', 10, 6)->index();
                $table->float('elevation');
                $table->string('provider', 50)->default('open-meteo');
                $table->timestamps();

                $table->unique(['lat', 'lng'], 'coord_elevation_lat_lng_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coordinate_elevations');
    }
};
