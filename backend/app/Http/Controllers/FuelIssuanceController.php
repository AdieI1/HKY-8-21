<?php

namespace App\Http\Controllers;

use App\Models\FuelIssuance;

class FuelIssuanceController extends Controller
{
    public function index()
    {
        return FuelIssuance::with(['fuel', 'vehicle', 'driver.user', 'issuedBy'])
            ->orderByDesc('issued_at')
            ->get();
    }

    public function show(FuelIssuance $fuelIssuance)
    {
        return $fuelIssuance->load(['fuel', 'vehicle', 'driver.user', 'issuedBy']);
    }
}