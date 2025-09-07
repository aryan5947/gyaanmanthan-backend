// utils/withTypedMiddleware.ts
import { CallbackError } from "mongoose";

/**
 * A wrapper for mongoose middlewares that ensures
 * errors are properly typed as CallbackError.
 */
export function withTypedMiddleware<T extends (...args: any[]) => void>(fn: T) {
  return (async function (this: any, ...args: any[]) {
    const next = args[args.length - 1] as (err?: CallbackError) => void;
    try {
      await (fn as any).apply(this, args);
    } catch (err) {
      console.error("Middleware error:", err);
      next(err as CallbackError);
    }
  }) as unknown as T;
}
