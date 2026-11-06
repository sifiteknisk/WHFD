import { DrizzleQueryError } from 'drizzle-orm'
import postgres from 'postgres'

export const getErrorConstraint = (error: any): string | undefined => {
  if (!(error instanceof DrizzleQueryError)) {
    return undefined
  }
  if (!(error.cause instanceof postgres.PostgresError)) {
    return undefined
  }
  return error.cause.constraint_name
}

// deadlock_detected and serialization_failure: Postgres rolled the whole
// transaction back, so running it again from the start is safe
const RETRYABLE_TX_CODES = new Set(['40P01', '40001'])

export const isRetryableTxError = (error: unknown): boolean => {
  const cause = error instanceof DrizzleQueryError ? error.cause : error
  return (
    cause instanceof postgres.PostgresError &&
    RETRYABLE_TX_CODES.has(cause.code)
  )
}

/** Run `fn` (one whole transaction) again when Postgres aborts it with a deadlock or serialization failure. */
export const retryTransaction = async <T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 20 } = {}
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= attempts || !isRetryableTxError(error)) {
        throw error
      }
      // jitter so the two victims of a deadlock don't collide again
      await Bun.sleep(baseDelayMs * attempt * (0.5 + Math.random()))
    }
  }
}

export const takeUnique = <T extends any[]>(
  values: T
): T[number] | undefined => {
  if (values.length !== 1) {
    return undefined
  }
  return values[0]
}
