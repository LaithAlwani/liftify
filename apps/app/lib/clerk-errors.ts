import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

// Turn whatever Clerk (or the network) throws into one friendly sentence we can
// show under a form. Clerk's `longMessage` is the most human-readable field.
export function getClerkErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const firstError = error.errors[0];
    return (
      firstError?.longMessage ??
      firstError?.message ??
      "Something went wrong. Please try again."
    );
  }
  return "Something went wrong. Please try again.";
}
