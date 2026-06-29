"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { useGetPendingNpsSurvey } from "@/lib/react-query/hooks/nps/useGetPendingNpsSurvey";
import { useSubmitNpsResponse } from "@/lib/react-query/hooks/nps/useSubmitNpsResponse";

const DISMISS_KEY = "nps_dismissed_until";

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function dismissFor24h() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
}

export default function NpsBanner() {
  const { data, isLoading } = useGetPendingNpsSurvey();
  const [dismissed, setDismissed] = useState(true);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const survey = data?.data;

  const { mutate: submitResponse, isPending } = useSubmitNpsResponse(() => {
    setSubmitted(true);
  });

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (isLoading || dismissed || !survey || submitted) return null;

  function handleDismiss() {
    dismissFor24h();
    setDismissed(true);
  }

  function handleSubmit() {
    if (selectedScore === null || !survey) return;
    submitResponse({
      surveyId: survey.surveyId,
      score: selectedScore,
      comment: comment.trim() || undefined,
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-gray-900">
            How was your experience at{" "}
            <span className="font-semibold">{survey.workspaceName}</span>?
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Dismiss survey"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Score buttons */}
      <div className="mb-1">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedScore(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors border ${
                selectedScore === i
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-400">Not at all likely</span>
          <span className="text-xs text-gray-400">Extremely likely</span>
        </div>
      </div>

      {/* Comment textarea — shows once a score is picked */}
      {selectedScore !== null && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional comments? (optional)"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-400"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedScore === null || isPending}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Dismiss for now
        </button>
      </div>
    </div>
  );
}
