<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use App\Models\AppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class IncidentReportController extends Controller
{
    private function processBase64Image(?string $imageString): ?string
    {
        if (empty($imageString)) {
            return null;
        }

        // If it's already a relative path or URL, ensure it fits column limit
        if (!str_starts_with($imageString, 'data:image/')) {
            return strlen($imageString) > 255 ? substr($imageString, 0, 255) : $imageString;
        }

        try {
            if (preg_match('/^data:image\/(\w+);base64,/', $imageString, $matches)) {
                $ext = strtolower($matches[1]);
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                    $ext = 'jpg';
                }
                $base64Data = substr($imageString, strpos($imageString, ',') + 1);
                $decoded = base64_decode($base64Data);
                if ($decoded === false) {
                    return null;
                }

                $filename = 'incident_' . time() . '_' . Str::random(10) . '.' . $ext;
                Storage::disk('public')->put('incidents/' . $filename, $decoded);
                return '/storage/incidents/' . $filename;
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed to decode incident report image: ' . $e->getMessage());
        }

        return null;
    }

    public function evaluateSmartRecommendation(array $types, string $severity = 'medium'): array
    {
        $hasAccident = in_array('accident', $types);
        $hasCargoDamage = in_array('cargo_damage', $types);
        $hasVehicleBreakdown = in_array('vehicle_breakdown', $types) || in_array('vehicle_problem', $types);
        $hasFlatTire = in_array('flat_tire', $types);
        $hasRoadIssue = in_array('road_issue', $types);

        // Case 1: Accident
        if ($hasAccident) {
            return [
                'action' => 'emergency_escalation',
                'title' => 'Emergency Protocol & Safety Investigation',
                'notes' => 'Accident reported. Prioritize driver/public safety and emergency services. Halt all cargo movement pending formal inspection and police/insurance clearance.',
                'severity' => 'high',
                'can_dispatch_relief' => false,
                'requires_refund_check' => $hasCargoDamage,
            ];
        }

        // Case 2: Compound Incident (Vehicle immobilized + Cargo Damaged)
        if (($hasVehicleBreakdown || $hasFlatTire) && $hasCargoDamage) {
            return [
                'action' => 'halt_and_inspect_cargo',
                'title' => 'Compound Incident: Vehicle Disabled & Cargo Damaged',
                'notes' => 'Vehicle is disabled and cargo damage was reported. DO NOT immediately transship cargo to a relief vehicle. Inspect cargo integrity first and initiate customer claim/refund review. Dispatch towing/roadside repair for the disabled truck.',
                'severity' => 'high',
                'can_dispatch_relief' => false,
                'requires_refund_check' => true,
            ];
        }

        // Case 3: Cargo Damage Only
        if ($hasCargoDamage) {
            return [
                'action' => 'cargo_claim_review',
                'title' => 'Cargo Damage / Insurance Claim Evaluation',
                'notes' => 'Cargo damage reported while truck is operational. Document photographic evidence and inspect item integrity. Contact customer to evaluate compensation, replacement redelivery, or delivery fee refund.',
                'severity' => ($severity === 'high') ? 'high' : 'medium',
                'can_dispatch_relief' => false,
                'requires_refund_check' => true,
            ];
        }

        // Case 4: Major Vehicle Breakdown (Cargo Intact)
        if ($hasVehicleBreakdown) {
            return [
                'action' => 'dispatch_relief_truck',
                'title' => 'Vehicle Disabled: Relief Vehicle & Transshipment Needed',
                'notes' => 'Vehicle cannot continue journey, but cargo is intact. Assign an idle relief truck to the incident GPS coordinates to transfer cargo and complete delivery on time. Schedule towing for disabled truck.',
                'severity' => ($severity === 'low') ? 'medium' : $severity,
                'can_dispatch_relief' => true,
                'requires_refund_check' => false,
            ];
        }

        // Case 5: Flat Tire (Cargo Intact)
        if ($hasFlatTire) {
            return [
                'action' => 'roadside_assistance',
                'title' => 'Roadside Tire Assistance / Spare Dispatch',
                'notes' => 'Tire puncture or failure reported with cargo intact. Dispatch mobile mechanic or replacement spare tire to incident GPS coordinates. If unrepairable on-site, reassign relief truck for cargo transshipment.',
                'severity' => $severity,
                'can_dispatch_relief' => true,
                'requires_refund_check' => false,
            ];
        }

        // Case 6: Road / Route Issue
        if ($hasRoadIssue) {
            return [
                'action' => 'reroute_advisory',
                'title' => 'Route Obstruction / Detour Advisory',
                'notes' => 'Route or road condition problem reported. Review live traffic data, provide alternative route guidance, and update expected arrival time.',
                'severity' => $severity,
                'can_dispatch_relief' => false,
                'requires_refund_check' => false,
            ];
        }

        return [
            'action' => 'operational_review',
            'title' => 'Standard Incident Operational Review',
            'notes' => 'Review driver description and attached photos to determine next dispatch and maintenance actions.',
            'severity' => $severity,
            'can_dispatch_relief' => true,
            'requires_refund_check' => false,
        ];
    }

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
            'incident_types' => 'nullable',
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

        // Handle incident_types multi-selection array
        $types = $request->input('incident_types', []);
        if (is_string($types)) {
            $types = json_decode($types, true) ?: [$types];
        }
        if (empty($types) && !empty($validated['incident_type'])) {
            $types = [$validated['incident_type']];
        }

        $validated['incident_types'] = array_values(array_unique(array_filter($types)));

        if (empty($validated['incident_type']) && count($validated['incident_types']) > 0) {
            $validated['incident_type'] = $validated['incident_types'][0];
        } elseif (empty($validated['incident_type'])) {
            $validated['incident_type'] = 'other';
        }

        if (empty($validated['severity'])) {
            $validated['severity'] = 'medium';
        }

        // Run Smart Recommendation Engine
        $rec = $this->evaluateSmartRecommendation($validated['incident_types'], $validated['severity']);
        $validated['recommended_action'] = $rec['action'];
        $validated['recommendation_title'] = $rec['title'];
        $validated['recommendation_notes'] = $rec['notes'];
        if (isset($rec['severity']) && $rec['severity'] === 'high') {
            $validated['severity'] = 'high';
        }

        if (empty($validated['status'])) {
            $validated['status'] = 'pending';
        }

        $validated['reported_at'] = now();

        // Handle uploaded file if present
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('incidents', 'public');
            $validated['photo_proof'] = '/storage/' . $path;
        } elseif (!empty($validated['photo_proof'])) {
            $validated['photo_proof'] = $this->processBase64Image($validated['photo_proof']);
        }

        // Handle photos if JSON string or array
        if (isset($validated['photos'])) {
            if (is_string($validated['photos'])) {
                $decoded = json_decode($validated['photos'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $validated['photos'] = $decoded;
                }
            }

            if (is_array($validated['photos'])) {
                $storedPhotos = [];
                foreach ($validated['photos'] as $item) {
                    $saved = $this->processBase64Image($item);
                    if ($saved) {
                        $storedPhotos[] = $saved;
                    }
                }
                $validated['photos'] = $storedPhotos;

                if (empty($validated['photo_proof']) && count($storedPhotos) > 0) {
                    $validated['photo_proof'] = $storedPhotos[0];
                }
            }
        }

        $report = IncidentReport::create($validated);

        try {
            $delivery = $report->delivery()->with(['request', 'driver.user'])->first();
            $driverName = $delivery?->driver?->user?->full_name ?? 'Driver';
            $reqId = $delivery?->request?->request_id ? 'REQ' . str_pad($delivery->request->request_id, 4, '0', STR_PAD_LEFT) : 'Trip';

            $formattedTypes = count($report->incident_types ?: []) > 1
                ? implode(' & ', array_map(fn($t) => ucfirst(str_replace('_', ' ', $t)), $report->incident_types))
                : ucfirst(str_replace('_', ' ', $report->incident_type));

            AppNotification::notify(
                'incident',
                'Incident Reported: ' . $report->recommendation_title,
                "{$driverName} reported ({$formattedTypes}) on {$reqId}. Recommended: {$report->recommendation_notes}",
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

    public function resolve(Request $request, $id)
    {
        $incident = IncidentReport::findOrFail($id);

        $validated = $request->validate([
            'action' => 'required|string|in:dispatch_relief,flag_refund,roadside_assist,mark_resolved',
            'notes' => 'nullable|string',
        ]);

        $incident->resolution_action = $validated['action'];
        if (!empty($validated['notes'])) {
            $incident->resolution_notes = $validated['notes'];
        }

        if ($validated['action'] === 'mark_resolved') {
            $incident->status = 'resolved';
            $incident->resolved_at = now();
        } elseif ($incident->status === 'pending') {
            $incident->status = 'investigating';
        }

        $incident->save();

        return response()->json([
            'message' => 'Incident resolution recorded successfully.',
            'incident' => $incident->fresh([
                'delivery.driver.user',
                'delivery.vehicle',
                'delivery.request.customer',
                'delivery.assignedByUser',
                'delivery.checklists.inspector',
                'reporter'
            ]),
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