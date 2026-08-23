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
        $request->validate([
            'delivery_id' => 'required|exists:deliveries,delivery_id',
            'customer_id' => 'required|exists:users,user_id',
            'overall_rating' => 'required|integer|min:1|max:5',
            'driver_rating' => 'required|integer|min:1|max:5',
            'comments' => 'nullable|string',
        ]);

        return Review::create($request->all());
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