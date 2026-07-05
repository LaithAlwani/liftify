"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// Where Google sends the user back after OAuth. Clerk finishes the handshake
// here and then forwards into the app.
export default function SSOCallbackPage() {
  return (
    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
      />
      Finishing sign-in…
    </div>
  );
}
