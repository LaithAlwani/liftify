import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SIGN_UP_URL } from "@/lib/site";

export function CTA() {
  return (
    <section className="container-page pb-20 sm:pb-24">
      <div className="relative overflow-hidden rounded-[30px] bg-accent px-6 py-16 text-center sm:py-[76px]">
        {/* Ink grid + diagonal stripe texture */}
        <div
          aria-hidden
          className="bg-grid-ink pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-44"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgba(10,10,11,.08) 0 12px, transparent 12px 24px)",
          }}
        />
        <h2 className="relative font-display text-4xl italic leading-[0.96] text-accent-foreground sm:text-5xl">
          STOP GUESSING.
          <br />
          START PROGRESSING.
        </h2>
        <p className="relative mx-auto mt-4 max-w-[34ch] text-lg text-accent-foreground/70">
          Your first workout is 30 seconds away. Free forever — no card required.
        </p>
        <div className="relative mt-7 flex justify-center">
          <a
            href={SIGN_UP_URL}
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0a0b] px-7 py-4 font-display text-[17px] italic text-accent transition-[filter] hover:brightness-125 active:translate-y-px"
          >
            Get started free
            <ArrowRight weight="bold" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
