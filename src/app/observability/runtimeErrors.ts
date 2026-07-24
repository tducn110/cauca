export type RuntimeErrorContext = {
  area: string;
  operation?: string;
  fatal?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
};

const seenErrors = new Set<string>();

export function normalizeError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string") return new Error(reason);
  try {
    return new Error(JSON.stringify(reason));
  } catch {
    return new Error(String(reason));
  }
}

export function reportRuntimeError(
  reason: unknown,
  context: RuntimeErrorContext,
): Error {
  const error = normalizeError(reason);
  const key = `${context.area}:${context.operation ?? "unknown"}:${error.name}:${error.message}`;

  if (!seenErrors.has(key)) {
    seenErrors.add(key);
    console.error(`[${context.area}] ${context.operation ?? "runtime failure"}`, {
      error,
      fatal: Boolean(context.fatal),
      metadata: context.metadata,
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("batca:runtime-error", {
      detail: {
        area: context.area,
        operation: context.operation,
        fatal: Boolean(context.fatal),
        message: error.message,
      },
    }));
  }

  return error;
}

export function installGlobalRuntimeErrorHandlers(): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    reportRuntimeError(event.error ?? event.message, {
      area: "window",
      operation: "error",
      fatal: false,
      metadata: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportRuntimeError(event.reason, {
      area: "window",
      operation: "unhandledrejection",
      fatal: false,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
