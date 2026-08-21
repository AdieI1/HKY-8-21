<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'role_id' => 1,
                'full_name' => 'Super Administrator',
                'email' => 'superadmin@hjytrucking.com',
                'phone' => '09123456789',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'role_id' => 2,
                'full_name' => 'Admin User',
                'email' => 'admin@hjytrucking.com',
                'phone' => '09123456788',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}