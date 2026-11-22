<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            // Insurance Information
            if (! Schema::hasColumn('vehicles', 'insurance_provider')) {
                $table->string('insurance_provider', 150)->nullable()->after('condition');
            }
            if (! Schema::hasColumn('vehicles', 'insurance_policy_number')) {
                $table->string('insurance_policy_number', 100)->nullable()->after('insurance_provider');
            }
            if (! Schema::hasColumn('vehicles', 'insurance_coverage_type')) {
                $table->string('insurance_coverage_type', 100)->nullable()->after('insurance_policy_number');
            }
            if (! Schema::hasColumn('vehicles', 'insurance_valid_from')) {
                $table->date('insurance_valid_from')->nullable()->after('insurance_coverage_type');
            }
            if (! Schema::hasColumn('vehicles', 'insurance_valid_until')) {
                $table->date('insurance_valid_until')->nullable()->after('insurance_valid_from');
            }
            if (! Schema::hasColumn('vehicles', 'insurance_policy_file')) {
                $table->string('insurance_policy_file', 255)->nullable()->after('insurance_valid_until');
            }

            // Registration Information
            if (! Schema::hasColumn('vehicles', 'or_number')) {
                $table->string('or_number', 100)->nullable()->after('insurance_policy_file');
            }
            if (! Schema::hasColumn('vehicles', 'cr_number')) {
                $table->string('cr_number', 100)->nullable()->after('or_number');
            }
            if (! Schema::hasColumn('vehicles', 'registration_date')) {
                $table->date('registration_date')->nullable()->after('cr_number');
            }
            if (! Schema::hasColumn('vehicles', 'expiration_date')) {
                $table->date('expiration_date')->nullable()->after('registration_date');
            }

            // Document uploads
            if (! Schema::hasColumn('vehicles', 'official_receipt_file')) {
                $table->string('official_receipt_file', 255)->nullable()->after('expiration_date');
            }
            if (! Schema::hasColumn('vehicles', 'certificate_of_registration_file')) {
                $table->string('certificate_of_registration_file', 255)->nullable()->after('official_receipt_file');
            }
            if (! Schema::hasColumn('vehicles', 'emission_certificate_file')) {
                $table->string('emission_certificate_file', 255)->nullable()->after('certificate_of_registration_file');
            }
            if (! Schema::hasColumn('vehicles', 'emission_date')) {
                $table->date('emission_date')->nullable()->after('emission_certificate_file');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'insurance_provider',
                'insurance_policy_number',
                'insurance_coverage_type',
                'insurance_valid_from',
                'insurance_valid_until',
                'insurance_policy_file',
                'or_number',
                'cr_number',
                'registration_date',
                'expiration_date',
                'official_receipt_file',
                'certificate_of_registration_file',
                'emission_certificate_file',
                'emission_date',
            ]);
        });
    }
};
