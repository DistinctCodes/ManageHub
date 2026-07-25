'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';

interface NpsWidgetProps {
  onDismiss: () => void;
}

export function NpsWidget({ onDismiss }: NpsWidgetProps) {
  const [step, setStep] = useState<'score' | 'comment' | 'thankyou'>('score');
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleScoreSelect = (value: number) => {
    setScore(value);
    setStep('comment');
  };

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment || undefined }),
      });
      setStep('thankyou');
    } catch (error) {
      console.error('Failed to submit NPS:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'thankyou') {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg border max-w-sm">
        <p className="text-center">Thank you for your feedback!</p>
        <button
          onClick={onDismiss}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg border max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">How likely are you to recommend us?</h4>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      {step === 'score' && (
        <div className="flex gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              onClick={() => handleScoreSelect(i)}
              className={`w-8 h-8 rounded ${
                i <= 6 ? 'bg-red-100 hover:bg-red-200' :
                i <= 8 ? 'bg-yellow-100 hover:bg-yellow-200' :
                'bg-green-100 hover:bg-green-200'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      )}
      {step === 'comment' && (
        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What's the main reason? (optional)"
            className="w-full p-2 border rounded mb-2"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}
