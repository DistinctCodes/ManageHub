import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface CountdownTimerProps {
  endsAt: Date | string;
  onExpire?: () => void;
}

const WARNING_THRESHOLD_SECONDS = 300;

function getRemainingSeconds(
  endsAt: Date | string,
): number {
  const endTime =
    new Date(endsAt).getTime();

  const now = Date.now();

  return Math.max(
    0,
    Math.floor(
      (endTime - now) / 1000,
    ),
  );
}

function formatTime(
  totalSeconds: number,
): string {
  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const seconds =
    totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((value) =>
      String(value).padStart(
        2,
        "0",
      ),
    )
    .join(":");
}

export const CountdownTimer =
  ({
    endsAt,
    onExpire,
  }: CountdownTimerProps) => {
    const [
      remainingSeconds,
      setRemainingSeconds,
    ] = useState(() =>
      getRemainingSeconds(
        endsAt,
      ),
    );

    const hasExpiredRef =
      useRef(false);

    useEffect(() => {
      setRemainingSeconds(
        getRemainingSeconds(
          endsAt,
        ),
      );

      hasExpiredRef.current =
        false;
    }, [endsAt]);

    useEffect(() => {
      const tick = () => {
        const remaining =
          getRemainingSeconds(
            endsAt,
          );

        setRemainingSeconds(
          remaining,
        );

        if (
          remaining === 0 &&
          !hasExpiredRef.current
        ) {
          hasExpiredRef.current =
            true;

          onExpire?.();
        }
      };

      tick();

      const intervalId =
        window.setInterval(
          tick,
          1000,
        );

      return () => {
        window.clearInterval(
          intervalId,
        );
      };
    }, [endsAt, onExpire]);

    const formattedTime =
      useMemo(
        () =>
          formatTime(
            remainingSeconds,
          ),
        [remainingSeconds],
      );

    const isWarning =
      remainingSeconds <=
      WARNING_THRESHOLD_SECONDS;

    return (
      <span
        data-testid="countdown-timer"
        className={
          isWarning
            ? "text-red-600 font-semibold"
            : ""
        }
      >
        {formattedTime}
      </span>
    );
  };

export default CountdownTimer;