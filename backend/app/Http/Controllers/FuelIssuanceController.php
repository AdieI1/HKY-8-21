<?php

namespace App\Http\Controllers;

use App\Models\FuelIssuance;
use Illuminate\Http\Request;

class FuelIssuanceController extends Controller
{
    public function index(Request $request)
    {
        $query = FuelIssuance::with([
            'fuel',
            'vehicle',
            'driver.user',
            'issuedBy',
            'receivedBy',
        ]);

        if ($request->filled('fuel_id')) {
            $query->where('fuel_id', $request->fuel_id);
        }

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        return $query->orderByDesc('issued_at')->orderByDesc('issuance_id')->get();
    }

    public function show(FuelIssuance $fuelIssuance)
    {
        return $fuelIssuance->load([
            'fuel',
            'vehicle',
            'driver.user',
            'issuedBy',
            'receivedBy',
        ]);
    }
}