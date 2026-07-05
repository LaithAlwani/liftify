// Shared button primitive (tokens-driven). Server-component safe — renders an
// anchor/Link or a <button>. Use `buttonClass` directly when you need the styles
// on another element.
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[background-color,transform,border-color] duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-strong",
  secondary: "border border-border text-foreground hover:border-subtle",
  ghost: "text-foreground hover:bg-muted",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function ButtonLink({
  href,
  external,
  variant,
  size,
  className,
  children,
}: CommonProps & { href: string; external?: boolean }) {
  const cls = buttonClass(variant, size, className);
  if (external) {
    return (
      <a href={href} className={cls} rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
