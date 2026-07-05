"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleButton } from "@/components/auth/google-button";
import { buttonClass } from "@/components/ui/button";
import { getClerkErrorMessage } from "@/lib/clerk-errors";

// Sign-up is two steps: collect details, then verify the emailed code.
type Step = "details" | "verify";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If an already-signed-in user lands here, send them into the app.
  useEffect(() => {
    if (isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });
      // Email a 6-digit code, then switch to the verification step.
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyEmail(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setErrorMessage("That code didn't verify your email. Try again.");
      }
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!isLoaded) return;
    setErrorMessage("");
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error));
    }
  }

  if (step === "verify") {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a code to {email}. Enter it below to finish.
        </p>

        <form onSubmit={handleVerifyEmail} className="mt-6 flex flex-col gap-4">
          <AuthField
            label="Verification code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={!isLoaded || submitting}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {submitting ? "Verifying…" : "Verify email"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start tracking your lifts in seconds.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <GoogleButton
          label="Sign up with Google"
          onClick={handleGoogleSignUp}
          disabled={!isLoaded || submitting}
        />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <AuthField
              label="First name"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <AuthField
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMessage ? (
            <p className="text-sm text-red-500">{errorMessage}</p>
          ) : null}

          {/* Clerk's bot-protection widget renders into this element. */}
          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={!isLoaded || submitting}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-accent-strong hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
