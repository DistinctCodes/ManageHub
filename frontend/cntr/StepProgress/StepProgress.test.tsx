import React from "react";

import {
  render,
  screen,
} from "@testing-library/react";

import {
  StepProgress,
} from "./StepProgress";

describe(
  "StepProgress",
  () => {
    const steps = [
      {
        label:
          "Details",
      },
      {
        label:
          "Payment",
      },
      {
        label:
          "Review",
      },
      {
        label:
          "Complete",
      },
    ];

    it(
      "renders all step labels",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={1}
          />,
        );

        expect(
          screen.getByText(
            "Details",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Payment",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Review",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Complete",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "renders completed state",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={1}
          />,
        );

        expect(
          screen.getByLabelText(
            "Details - Completed",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "renders current state",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={1}
          />,
        );

        expect(
          screen.getByLabelText(
            "Payment - Current",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "renders upcoming state",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={1}
          />,
        );

        expect(
          screen.getByLabelText(
            "Review - Upcoming",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByLabelText(
            "Complete - Upcoming",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "renders connectors",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={1}
          />,
        );

        expect(
          screen.getByTestId(
            "connector-0",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByTestId(
            "connector-1",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByTestId(
            "connector-2",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "renders proper aria labels",
      () => {
        render(
          <StepProgress
            steps={steps}
            currentStep={2}
          />,
        );

        expect(
          screen.getByLabelText(
            "Details - Completed",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByLabelText(
            "Payment - Completed",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByLabelText(
            "Review - Current",
          ),
        ).toBeInTheDocument();

        expect(
          screen.getByLabelText(
            "Complete - Upcoming",
          ),
        ).toBeInTheDocument();
      },
    );
  },
);