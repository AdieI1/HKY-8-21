<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use App\Models\AppNotification;
use Illuminate\Http\Request;

class IncidentReportController extends Controller
{
    public function index()
    {
        return IncidentReport::with([
            'delivery.driver.user',
            'delivery.vehicle',
            'delivery.request.customer',
            'delivery.assignedByUser',
            'delivery.checklists.inspector',
            'reporter'
        ])->orderByDesc('reported_at')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'delivery_id' => 'required|exists:deliveries,delivery_id',
            'reported_by' => 'nullable|exists:users,user_id',
            'incident_type' => 'nullable|string',
            'severity' => 'nullable|in:low,medium,high',
            'description' => 'nullable|string',
            'location_address' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'photo_proof' => 'nullable|string',
            'photos' => 'nullable',
            'status' => 'nullable|in:pending,investigating,resolved',
            'resolved_at' => 'nullable|date',
        ]);

        if (empty($validated['reported_by'])) {
            $user = $request->user();
            if ($user) {
                $validated['reported_by'] = $user->user_id;
            } else {
                // Fallback to delivery driver's user_id
                $del = \App\Models\Delivery::with('driver')->find($validated['delivery_id']);
                $validated['reported_by'] = $del?->driver?->user_id ?? 1;
            }
        }

        if (empty($validated['incident_type'])) {
            $validated['incident_type'] = 'other';
        }

        if (empty($validated['severity'])) {
            $validated['severity'] = 'medium';
        }

        if (empty($validated['status'])) {
            $validated['status'] = 'pending';
        }

        $validated['reported_at'] = now();

        // Handle photos if JSON string or array
        if (isset($validated['photos']) && is_string($validated['photos'])) {
            $decoded = json_decode($validated['photos'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $validated['photos'] = $decoded;
            }
        }

        // Handle uploaded file if present
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('incidents', 'public');
            $validated['photo_proof'] = '/storage/' . $path;
        }

        $report = IncidentReport::create($validated);

        try {
            $delivery = $report->delivery()->with(['request', 'driver.user'])->first();
            $driverName = $delivery?->driver?->user?->full_name ?? 'Driver';
            $reqId = $delivery?->request?->request_id ? 'REQ' . str_pad($delivery->request->request_id, 4, '0', STR_PAD_LEFT) : 'Trip';

            AppNotification::notify(
                'incident',
                'Incident Reported',
                "{$driverName} reported an incident (" . ucfirst(str_replace('_', ' ', $report->incident_type)) . ") on {$reqId}.",
                '/drivers'
            );
        } catch (\Throwable $e) {
            \Log::warning("Notification failed for incident report: " . $e->getMessage());
        }

        return $report->load([
            'delivery.driver.user',
            'delivery.vehicle',
            'delivery.request.customer',
            'delivery.assignedByUser',
            'delivery.checklists.inspector',
            'reporter'
        ]);
    }

    public function show(IncidentReport $incidentReport)
    {
        return $incidentReport->load([
            'delivery.driver.user',
            'delivery.vehicle',
            'delivery.request.customer',
            'delivery.assignedByUser',
            'delivery.checklists.inspector',
            'reporter'
        ]);
    }

    public function update(Request $request, IncidentReport $incidentReport)
    {
        $incidentReport->update($request->all());

        return $incidentReport->load([
            'delivery.driver.user',
            'delivery.vehicle',
            'delivery.request.customer',
            'delivery.assignedByUser',
            'delivery.checklists.inspector',
            'reporter'
        ]);
    }

    public function destroy(IncidentReport $incidentReport)
    {
        $incidentReport->delete();

        return response()->json([
            'message' => 'Incident report deleted successfully.'
        ]);
    }
}