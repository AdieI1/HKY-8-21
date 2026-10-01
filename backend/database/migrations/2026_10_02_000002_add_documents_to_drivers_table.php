<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('license_file')->nullable()->after('authorized_by');
            $table->string('medical_certificate_file')->nullable()->after('existing_conditions');
            $table->string('clearance_file')->nullable()->after('medical_certificate_file');
            $table->string('clearance_type', 50)->nullable()->default('NBI Clearance')->after('clearance_file');
            $table->date('clearance_date')->nullable()->after('clearance_type');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'license_file',
                'medical_certificate_file',
                'clearance_file',
                'clearance_type',
                'clearance_date',
            ]);
        });
    }
};
