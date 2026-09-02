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
        // Remove legacy super admin account if exists
        User::where('email', 'superadmin@hjytrucking.com')->delete();

        $users = [
            [
                'role_name' => 'Admin',
                'full_name' => 'Administrator',
                'email' => 'admin@hjytrucking.com',
                'phone' => '09123456789',
            ],
            [
                'role_name' => 'Staff',
                'full_name' => 'Mark Grayson',
                'email' => 'staff@hjytrucking.com',
                'phone' => '09123456788',
            ],
            [
                'role_name' => 'Staff',
                'full_name' => 'Sarah Dispatcher',
                'email' => 'dispatcher@hjytrucking.com',
                'phone' => '09123456787',
            ],
            [
                'role_name' => 'Staff',
                'full_name' => 'Mark Inventory',
                'email' => 'inventory@hjytrucking.com',
                'phone' => '09123456786',
            ],
        ];

        foreach ($users as $seedUser) {
            $role = Role::where('role_name', $seedUser['role_name'])->firstOrFail();

            User::updateOrCreate(
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
