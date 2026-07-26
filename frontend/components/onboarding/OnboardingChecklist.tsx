'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, User, Calendar, MapPin } from 'lucide-react';

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  href: string;
}

interface OnboardingChecklistProps {
  userId: string;
}

export function OnboardingChecklist({ userId }: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchOnboardingStatus();
  }, [userId]);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await fetch(`/api/onboarding/${userId}`);
      const data = await response.json();
      setSteps(data.steps);
      setDismissed(data.dismissed);
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await fetch(`/api/onboarding/${userId}/dismiss`, { method: 'POST' });
      setDismissed(true);
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (dismissed || steps.every((s) => s.completed)) {
    return null;
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Complete Your Profile</h3>
        <button
          onClick={handleDismiss}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Don't show again
        </button>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{completedCount} of {steps.length} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <a
              href={step.href}
              className="flex items-center gap-2 text-sm hover:text-blue-600"
            >
              {step.completed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
              <span className={step.completed ? 'line-through text-gray-500' : ''}>
                {step.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
