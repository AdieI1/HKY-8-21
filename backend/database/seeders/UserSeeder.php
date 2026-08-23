<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'role_name' => 'Super Admin',
                'full_name' => 'Super Administrator',
                'email' => 'superadmin@hjytrucking.com',
                'phone' => '09123456789',
            ],
            [
                'role_name' => 'Admin',
                'full_name' => 'Admin User',
                'email' => 'admin@hjytrucking.com',
                'phone' => '09123456788',
            ],
        ];

        foreach ($users as $seedUser) {
            $role = Role::where('role_name', $seedUser['role_name'])->firstOrFail();

            User::firstOrCreate(
                ['email' => $seedUser['email']],
                [
                    'role_id' => $role->role_id,
                    'full_name' => $seedUser['full_name'],
                    'phone' => $seedUser['phone'],
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                    'status' => 'active',
                ]
            );
        }
    }
}
