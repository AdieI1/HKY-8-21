<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $query = Review::with([
            'delivery.request.customer',
            'delivery.driver.user',
            'delivery.vehicle',
            'customer'
        ]);

        if ($request->has('driver_id')) {
            $query->whereHas('delivery', function ($q) use ($request) {
                $q->where('driver_id', $request->query('driver_id'));
            });
        } elseif ($request->user() && strtolower($request->user()->role?->role_name ?? '') === 'driver') {
            $driverId = $request->user()->driver?->driver_id;
            if ($driverId) {
                $query->whereHas('delivery', function ($q) use ($driverId) {
                    $q->where('driver_id', $driverId);
                });
            }
        }

        return $query->orderByDesc('review_id')->get();
    }

    public function store(Request $request)
    {
        $customerId = $request->customer_id ?? $request->user()?->user_id;

        $validated = $request->validate([
            'delivery_id' => 'nullable|exists:deliveries,delivery_id',
            'customer_id' => 'nullable|exists:users,user_id',
            'overall_rating' => 'required|integer|min:1|max:5',
            'driver_rating' => 'nullable|integer|min:1|max:5',
            'comments' => 'nullable|string|max:1000',
            'photo' => 'nullable|file|image|max:10240',
        ]);

        $validated['customer_id'] = $customerId;
        if (empty($validated['delivery_id'])) {
            $validated['driver_rating'] = null;
        } else {
            $validated['driver_rating'] = $validated['driver_rating'] ?? $validated['overall_rating'];
        }

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $request->file('photo')->store('review-photos', 'public');
        }

        unset($validated['photo']);

        if (!empty($validated['delivery_id'])) {
            $review = Review::updateOrCreate(
                [
                    'delivery_id' => $validated['delivery_id'],
                    'customer_id' => $validated['customer_id'],
                ],
                $validated
            );
        } else {
            $review = Review::create($validated);
        }

        return response()->json($review->load([
            'delivery.request.customer',
            'delivery.driver.user',
            'delivery.vehicle',
            'customer'
        ]), 201);
    }

    public function show(Review $review)
    {
        return $review->load([
            'delivery.request.customer',
            'delivery.driver.user',
            'delivery.vehicle',
            'customer'
        ]);
    }

    public function update(Request $request, Review $review)
    {
        $review->update($request->all());

        return $review;
    }

    public function destroy(Review $review)
    {
        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully.'
        ]);
    }
}