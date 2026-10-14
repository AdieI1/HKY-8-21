<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'sss_number')) {
                $table->string('sss_number', 50)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'philhealth_number')) {
                $table->string('philhealth_number', 50)->nullable()->after('sss_number');
            }
            if (!Schema::hasColumn('users', 'pagibig_number')) {
                $table->string('pagibig_number', 50)->nullable()->after('philhealth_number');
            }
            if (!Schema::hasColumn('users', 'deductible_taxes')) {
                $table->string('deductible_taxes', 100)->nullable()->after('pagibig_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'sss_number',
                'philhealth_number',
                'pagibig_number',
                'deductible_taxes',
            ]);
        });
    }
};
