<?php

namespace App\Http\Controllers;

use App\Models\BugReport;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BugReportController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            BugReport::with('user.role')
                ->orderByDesc('report_id')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'category' => 'nullable|string',
            'app_source' => 'nullable|string',
            'reporter_name' => 'nullable|string',
            'reporter_role' => 'nullable|string',
            'device_info' => 'nullable|string',
        ]);

        $user = $request->user();
        $reporterName = $validated['reporter_name'] ?? $user?->full_name ?? $user?->name ?? 'Anonymous User';
        $roleName = $validated['reporter_role'] ?? $user?->role?->role_name ?? 'User';

        $report = BugReport::create([
            'user_id' => $user?->user_id,
            'reporter_name' => $reporterName,
            'reporter_role' => strtolower($roleName),
            'app_source' => $validated['app_source'] ?? 'general-app',
            'category' => $validated['category'] ?? 'General Issue',
            'description' => $validated['description'],
            'device_info' => $validated['device_info'] ?? null,
        ]);

        // Send real-time notification to Admin
        try {
            $summary = Str::limit($report->description, 65);
            AppNotification::notify(
                'bug_report',
                "New Bug Report ({$report->ticket_number})",
                "{$report->reporter_name} ({$report->reporter_role}) reported: {$report->category} — {$summary}",
                '/settings?tab=bugs'
            );
        } catch (\Throwable $e) {
            // Non-blocking notification fail
        }

        return response()->json([
            'message' => 'Bug report submitted successfully.',
            'report' => $report->load('user.role'),
        ], 201);
    }

    public function show(BugReport $bugReport)
    {
        return response()->json($bugReport->load('user.role'));
    }

    public function destroy(BugReport $bugReport)
    {
        $bugReport->delete();

        return response()->json([
            'message' => 'Bug report deleted successfully.'
        ]);
    }
}
