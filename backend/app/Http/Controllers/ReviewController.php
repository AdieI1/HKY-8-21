<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index()
    {
        return Review::with(['delivery', 'customer'])->get();
    }

    public function store(Request $request)
    {
        $customerId = $request->customer_id ?? $request->user()?->user_id;

        $validated = $request->validate([
            'delivery_id' => 'required|exists:deliveries,delivery_id',
            'customer_id' => 'nullable|exists:users,user_id',
            'overall_rating' => 'required|integer|min:1|max:5',
            'driver_rating' => 'required|integer|min:1|max:5',
            'comments' => 'nullable|string|max:1000',
            'photo' => 'nullable|file|image|max:10240',
        ]);

        $validated['customer_id'] = $customerId;

        if ($request->hasFile('photo')) {
            $validated['photo_path'] = $request->file('photo')->store('review-photos', 'public');
        }

        unset($validated['photo']);

        $review = Review::updateOrCreate(
            [
                'delivery_id' => $validated['delivery_id'],
                'customer_id' => $validated['customer_id'],
            ],
            $validated
        );

        return response()->json($review->load(['delivery', 'customer']), 201);
    }

    public function show(Review $review)
    {
        return $review->load(['delivery', 'customer']);
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