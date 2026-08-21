<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
    public function index()
    {
        return IncidentReport::with(['delivery.driver.user', 'delivery.request', 'reporter'])->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'delivery_id' => 'required|exists:deliveries,delivery_id',
            'reported_by' => 'required|exists:users,user_id',
            'incident_type' => 'required|in:accident,delay,damage,lost_item,other',
            'severity' => 'required|in:low,medium,high',
            'description' => 'nullable|string',
            'photo_proof' => 'nullable|string',
            'status' => 'required|in:pending,investigating,resolved',
            'resolved_at' => 'nullable|date',
        ]);

        return IncidentReport::create($request->all());
    }

    public function show(IncidentReport $incidentReport)
    {
        return $incidentReport->load(['delivery.driver.user', 'reporter']);
    }

    public function update(Request $request, IncidentReport $incidentReport)
    {
        $incidentReport->update($request->all());

        return $incidentReport;
    }

    public function destroy(IncidentReport $incidentReport)
    {
        $incidentReport->delete();

        return response()->json([
            'message' => 'Incident report deleted successfully.'
        ]);
    }
}