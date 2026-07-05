import { GoogleLogo } from "@phosphor-icons/react";

// "Continue with Google" button. Each auth page passes its own handler because
// sign-in and sign-up start the OAuth flow from different Clerk objects.
export function GoogleButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      <GoogleLogo weight="bold" className="size-5" />
      {label}
    </button>
  );
}
