<?php

namespace App\Http\Controllers;

use App\Models\SystemLog;
use Illuminate\Http\Request;

class SystemLogController extends Controller
{
    public function index()
    {
        return SystemLog::with('user')->get();
    }

    public function show(SystemLog $systemLog)
    {
        return $systemLog->load('user');
    }

    public function destroy(SystemLog $systemLog)
    {
        $systemLog->delete();

        return response()->json([
            'message'=>'System log deleted.'
        ]);
    }
}