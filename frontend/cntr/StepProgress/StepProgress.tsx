import React from "react";

export interface Step {
  label: string;
}

export interface StepProgressProps {
  steps: Step[];
  currentStep: number;
}

type StepState =
  | "completed"
  | "current"
  | "upcoming";

export const StepProgress = ({
  steps,
  currentStep,
}: StepProgressProps) => {
  const getState = (
    index: number,
  ): StepState => {
    if (index < currentStep) {
      return "completed";
    }

    if (index === currentStep) {
      return "current";
    }

    return "upcoming";
  };

  return (
    <div
      className="w-full"
      data-testid="step-progress"
    >
      <div className="flex items-start justify-between">
        {steps.map(
          (step, index) => {
            const state =
              getState(index);

            const isCompleted =
              state ===
              "completed";

            const isCurrent =
              state ===
              "current";

            const isUpcoming =
              state ===
              "upcoming";

            return (
              <React.Fragment
                key={step.label}
              >
                <div
                  className="
                    flex
                    flex-col
                    items-center
                    flex-1
                  "
                >
                  <div
                    aria-label={`${step.label} - ${
                      isCompleted
                        ? "Completed"
                        : isCurrent
                        ? "Current"
                        : "Upcoming"
                    }`}
                    data-testid={`step-${index}`}
                    className={[
                      "flex",
                      "h-10",
                      "w-10",
                      "items-center",
                      "justify-center",
                      "rounded-full",
                      "border-2",
                      "transition-all",
                      isCompleted &&
                        "bg-blue-600 border-blue-600 text-white",
                      isCurrent &&
                        "bg-blue-600 border-blue-600 ring-4 ring-blue-200 text-white",
                      isUpcoming &&
                        "border-gray-300 bg-white text-gray-400",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isCompleted
                      ? "✓"
                      : index + 1}
                  </div>

                  <span
                    className="
                      mt-2
                      text-center
                      text-xs
                      sm:text-sm
                    "
                  >
                    {step.label}
                  </span>
                </div>

                {index <
                  steps.length -
                    1 && (
                  <div
                    data-testid={`connector-${index}`}
                    className="
                      mt-5
                      h-0.5
                      flex-1
                    "
                  >
                    <div
                      className={[
                        "h-full",
                        index <
                        currentStep
                          ? "bg-blue-600"
                          : "bg-gray-300",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          },
        )}
      </div>
    </div>
  );
};

export default StepProgress;