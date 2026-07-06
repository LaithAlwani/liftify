import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next 16 renamed the `middleware` file convention to `proxy`. Clerk's
// clerkMiddleware() is the default-exported request handler Next invokes.
// Everything is protected except the auth routes.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/robots.txt",
  "/sitemap.xml",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Send signed-out users to our own /sign-in screen. Without an explicit URL,
    // Clerk falls back to its hosted Account Portal (accounts.dev) — the
    // ClerkProvider's signInUrl only configures the client, not this middleware.
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ico|webp|avif|woff2?|ttf|otf|map|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
