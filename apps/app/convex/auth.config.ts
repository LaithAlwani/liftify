// Clerk → Convex JWT integration.
//
// CLERK_JWT_ISSUER_DOMAIN must be set as a Convex environment variable.
// Get it from: Clerk Dashboard → JWT Templates → Convex (or "JWT issuer" on the
// "Sessions" page) → copy the issuer URL (e.g. https://example.clerk.accounts.dev).
//
// Set via:  npx convex env set CLERK_JWT_ISSUER_DOMAIN https://...
//
// Once a production Clerk instance exists, add a second entry with its issuer.

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
