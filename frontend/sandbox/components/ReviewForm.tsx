"use client";

import { useState } from "react";
import { Star, StarHalf, StarOff } from "lucide-react";

interface ReviewFormProps {
  workspaceId: string;
  bookingId: string;
  onSuccess: () => void;
}

export default function ReviewForm({ workspaceId, bookingId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError(false);

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, you would make an API call here
      // const response = await fetch(`/api/workspaces/${workspaceId}/reviews`, {
      //   method: "POST",
      //   body: JSON.stringify({ workspaceId, bookingId, rating, comment })
      // });
      // if (!response.ok) throw new Error("Failed to submit review");

      setSubmitSuccess(true);
      onSuccess();
    } catch (err) {
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setComment(value);
      setCommentCount(value.length);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Star className="text-green-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you for your review!</h3>
        <p className="text-gray-600">Your feedback helps us improve the workspace experience.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">How would you rate this workspace?</h3>
        <div className="flex items-center justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => handleRatingChange(star)}
              onMouseLeave={() => handleRatingChange(rating)}
              onClick={() => handleRatingChange(star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              {star <= rating ? (
                <Star className="h-5 w-5 text-yellow-400" />
              ) : (
                <StarOff className="h-5 w-5 text-gray-300 hover:text-yellow-400" />
              )}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-gray-500">
            You rated this workspace {rating}/5
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Add a comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={handleCommentChange}
          placeholder="Share your experience..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={500}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{commentCount}/500</span>
          <span>{commentCount === 0 ? "Optional" : ""}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className={`w-full px-4 py-2 rounded-md font-medium transition-colors
          ${rating === 0 || isSubmitting
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"}
        `}
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>

      {submitError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          Failed to submit review. Please try again.
        </div>
      )}
    </form>
  );
}