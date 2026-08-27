import { ValidationError } from './types';

/* The adapter validates, not the form. A repository throws ValidationError with
   a field -> message map (data/types.ts), and this turns that into the shape a
   form renders. Forms still check what they can locally for instant feedback,
   but the repository's answer is the authoritative one — a REST adapter will
   return the same shape from the server, so no form changes when it lands. */

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ValidationError ? error.fields : {};
}

/** The message to show when a failure is not per-field (network, not-found). */
export function formMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ValidationError) return null;
  return error instanceof Error ? error.message : String(error);
}
