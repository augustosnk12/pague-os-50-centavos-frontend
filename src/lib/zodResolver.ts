import type { FieldError, FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { ZodTypeAny } from 'zod'

// Minimal react-hook-form resolver backed by Zod, so we can validate with Zod
// (and Portuguese messages) without pulling in @hookform/resolvers.
export function zodResolver<T extends FieldValues>(schema: ZodTypeAny): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values)

    if (result.success) {
      return { values: result.data as T, errors: {} }
    }

    const errors: Record<string, unknown> = {}
    for (const issue of result.error.issues) {
      if (issue.path.length === 0) continue

      let target = errors
      for (let i = 0; i < issue.path.length - 1; i++) {
        const key = String(issue.path[i])
        target[key] ??= {}
        target = target[key] as Record<string, unknown>
      }

      const leaf = String(issue.path[issue.path.length - 1])
      // Keep only the first error per field, matching RHF defaults.
      if (!target[leaf]) {
        target[leaf] = { type: issue.code, message: issue.message } satisfies FieldError
      }
    }

    return { values: {}, errors: errors as unknown as FieldErrors<T> }
  }
}
