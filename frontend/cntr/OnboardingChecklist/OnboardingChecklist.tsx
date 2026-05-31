import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming standard shadcn/tailwind setup

export interface OnboardingStep {
  key: string;
  label: string;
  isComplete: boolean;
  description: string;
}

export interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onStepClick?: (key: string) => void;
  className?: string;
}

export function OnboardingChecklist({ steps, onStepClick, className }: OnboardingChecklistProps) {
  if (!steps || steps.length === 0) return null;

  const totalCount = steps.length;
  const completedCount = steps.filter((step) => step.isComplete).length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  if (completedCount === totalCount) {
    return (
      <div className={cn("p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm text-center", className)}>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Onboarding complete! 🎉
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You're all set to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm", className)}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Getting Started</h3>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {completedCount} of {totalCount} completed
          </span>
        </div>
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500 ease-in-out" 
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const isComplete = step.isComplete;
          return (
            <div 
              key={step.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-md transition-colors",
                !isComplete && onStepClick ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" : "",
                isComplete ? "opacity-60" : ""
              )}
              onClick={() => {
                if (!isComplete && onStepClick) {
                  onStepClick(step.key);
                }
              }}
              role={!isComplete && onStepClick ? "button" : "listitem"}
              tabIndex={!isComplete && onStepClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isComplete && onStepClick) {
                    onStepClick(step.key);
                  }
                }
              }}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className={cn(
                  "text-sm font-medium",
                  isComplete ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-zinc-50"
                )}>
                  {step.label}
                </h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
