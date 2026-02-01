export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(level: LogLevel = "info"): Logger {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const threshold = levels.indexOf(level);

  const log = (lvl: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (levels.indexOf(lvl) < threshold) return;
    const prefix = lvl.toUpperCase();
    const payload = meta ? ` ${JSON.stringify(meta)}` : "";
    // eslint-disable-next-line no-console
    console.log(`[${prefix}] ${message}${payload}`);
  };

  return {
    debug: (m, meta) => log("debug", m, meta),
    info: (m, meta) => log("info", m, meta),
    warn: (m, meta) => log("warn", m, meta),
    error: (m, meta) => log("error", m, meta)
  };
}
