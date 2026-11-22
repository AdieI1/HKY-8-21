<?php

namespace App\Http\Controllers;

use App\Models\SystemLog;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    public function index()
    {
        return SystemLog::with('user.role')
            ->orderByDesc('timestamp')
            ->orderByDesc('log_id')
            ->get();
    }

    public function show(SystemLog $systemLog)
    {
        return $systemLog->load('user.role');
    }

    public function destroy(SystemLog $systemLog)
    {
        $systemLog->delete();

        return response()->json([
            'message' => 'System log deleted.'
        ]);
    }
}