import React from "react";

import {
  render,
  screen,
  act,
} from "@testing-library/react";

import {
  CountdownTimer,
} from "./CountdownTimer";

describe(
  "CountdownTimer",
  () => {
    beforeEach(() => {
      jest.useFakeTimers();

      jest.setSystemTime(
        new Date(
          "2026-01-01T12:00:00Z",
        ),
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it(
      "renders HH:MM:SS format",
      () => {
        render(
          <CountdownTimer
            endsAt={
              new Date(
                "2026-01-01T13:01:05Z",
              )
            }
          />,
        );

        expect(
          screen.getByText(
            "01:01:05",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "turns red when 5 minutes remain",
      () => {
        render(
          <CountdownTimer
            endsAt={
              new Date(
                "2026-01-01T12:05:00Z",
              )
            }
          />,
        );

        expect(
          screen.getByTestId(
            "countdown-timer",
          ),
        ).toHaveClass(
          "text-red-600",
        );
      },
    );

    it(
      "calls onExpire exactly once",
      () => {
        const onExpire =
          jest.fn();

        render(
          <CountdownTimer
            endsAt={
              new Date(
                "2026-01-01T12:00:02Z",
              )
            }
            onExpire={
              onExpire
            }
          />,
        );

        act(() => {
          jest.advanceTimersByTime(
            5000,
          );
        });

        expect(
          onExpire,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "updates every second",
      () => {
        render(
          <CountdownTimer
            endsAt={
              new Date(
                "2026-01-01T12:00:10Z",
              )
            }
          />,
        );

        act(() => {
          jest.advanceTimersByTime(
            1000,
          );
        });

        expect(
          screen.getByText(
            "00:00:09",
          ),
        ).toBeInTheDocument();
      },
    );

    it(
      "clears interval on unmount",
      () => {
        const clearSpy =
          jest.spyOn(
            window,
            "clearInterval",
          );

        const {
          unmount,
        } = render(
          <CountdownTimer
            endsAt={
              new Date(
                "2026-01-01T12:00:10Z",
              )
            }
          />,
        );

        unmount();

        expect(
          clearSpy,
        ).toHaveBeenCalled();

        clearSpy.mockRestore();
      },
    );
  },
);