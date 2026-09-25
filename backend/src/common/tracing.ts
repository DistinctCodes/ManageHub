import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Attributes, Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const TRACER_NAME = 'managehub-backend';
const DEFAULT_SERVICE_NAME = 'managehub-backend';
const DEFAULT_SERVICE_VERSION = '0.0.1';
const DEFAULT_TRACE_ENDPOINT = 'http://localhost:4318/v1/traces';

let tracingSdk: NodeSDK | undefined;
let sharedTracer: Tracer | undefined;
let tracerOverride: Pick<Tracer, 'startSpan'> | undefined;

/**
 * Installs the process-wide OpenTelemetry SDK when tracing is explicitly
 * enabled. The early return is intentional: local development and tests must
 * not create an exporter, provider, context manager, or background flush loop
 * merely because the tracing helpers are imported.
 */
export function initTracing(): void {
  if (process.env.OTEL_ENABLED !== 'true') {
    return;
  }

  if (tracingSdk) {
    return;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]:
      process.env.OTEL_SERVICE_NAME || DEFAULT_SERVICE_NAME,
    // npm exposes the backend package version to npm-run processes. The
    // fallback keeps direct `node dist/main` invocations identifiable too.
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version || DEFAULT_SERVICE_VERSION,
  });
  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_TRACE_ENDPOINT,
  });

  tracingSdk = new NodeSDK({
    resource,
    traceExporter: exporter,
  });
  tracingSdk.start();
}

/**
 * Flushes and shuts down the SDK created by initTracing. It is intentionally
 * exported rather than tied to a process signal so an embedding application
 * can flush spans during its own graceful-shutdown sequence.
 */
export async function shutdownTracing(): Promise<void> {
  const sdk = tracingSdk;
  tracingSdk = undefined;
  sharedTracer = undefined;

  if (sdk) {
    await sdk.shutdown();
  }
}

/**
 * Returns the shared tracer used by manual spans and HTTP middleware. The
 * OpenTelemetry API supplies a safe no-op tracer until a provider is
 * registered, so callers do not need a feature flag or a second enabled-state
 * check.
 */
export function getTracer(): Tracer {
  if (tracerOverride) {
    return tracerOverride as Tracer;
  }

  if (!sharedTracer) {
    sharedTracer = trace.getTracer(TRACER_NAME);
  }
  return sharedTracer;
}

/**
 * Test-only seam for proving the helper's lifecycle without pulling in an
 * additional in-memory SDK. Production code never calls this function; the
 * normal path always uses the API tracer returned by getTracer().
 */
export function setTracerForTesting(
  tracer: Pick<Tracer, 'startSpan'> | undefined,
): void {
  tracerOverride = tracer;
}

/**
 * Runs an asynchronous operation inside a child span and keeps that span in
 * the active context for the whole callback. Exceptions are recorded, marked
 * as errors, rethrown unchanged, and the span is ended in every path.
 */
export function withSpan<T>(
  name: string,
  callback: () => T | Promise<T>,
  attributes?: Attributes,
): Promise<T> {
  const span = getTracer().startSpan(name, { attributes });
  const activeContext = trace.setSpan(context.active(), span);

  return context.with(activeContext, async () => {
    try {
      const result = await callback();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
