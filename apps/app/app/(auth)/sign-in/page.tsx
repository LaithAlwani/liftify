"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleButton } from "@/components/auth/google-button";
import { buttonClass } from "@/components/ui/button";
import { getClerkErrorMessage } from "@/lib/clerk-errors";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If an already-signed-in user lands here, send them into the app.
  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  async function handleEmailSignIn(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setErrorMessage("Additional verification is required to sign in.");
      }
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!isLoaded) return;
    setErrorMessage("");
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error));
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to keep logging your lifts.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <GoogleButton
          label="Continue with Google"
          onClick={handleGoogleSignIn}
          disabled={!isLoaded || submitting}
        />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={!isLoaded || submitting}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-accent-strong hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
