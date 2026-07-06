"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";

// Where Google sends the user back after OAuth. Clerk finishes the handshake
// here and then forwards into the app. The sign-in / sign-up pages tag the
// redirect with `?flow=` so we can show the right message while it works.
function SSOCallbackContent() {
  const searchParams = useSearchParams();
  const isSignUp = searchParams.get("flow") === "sign-up";
  const message = isSignUp ? "Creating your account…" : "Signing you in…";

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
      />
      <Spinner className="size-8" />
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Spinner className="size-8" />
          <p className="text-sm font-medium text-foreground">Signing you in…</p>
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
  );
}
