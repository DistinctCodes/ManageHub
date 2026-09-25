// Wires retention job failures into an alerting hook so a thrown error
// doesn't just quietly stop the job with no signal.
export interface RetentionFailureAlert {
  job: 'retention';
  message: string;
  occurredAt: Date;
}

export type AlertSink = (alert: RetentionFailureAlert) => void;

export function reportRetentionFailure(
  error: unknown,
  sink: AlertSink,
): void {
  const message = error instanceof Error ? error.message : String(error);
  sink({ job: 'retention', message, occurredAt: new Date() });
}

export async function runRetentionWithAlerting(
  run: () => Promise<void>,
  sink: AlertSink,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    reportRetentionFailure(error, sink);
    throw error;
  }
}
