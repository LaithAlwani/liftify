"use client";

import Image from "next/image";
import heroImg from "@/public/hero.jpg";
import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  Lightning,
  Flame,
  Check,
  ArrowRight,
  TrendUp,
} from "@phosphor-icons/react";
import { SIGN_UP_URL } from "@/lib/site";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const EXERCISES = [
  { name: "Bench Press", detail: "3 × 8 · 80 kg", top: "PR +2.5" },
  { name: "Overhead Press", detail: "3 × 10 · 45 kg", top: "—" },
  { name: "Incline Dumbbell", detail: "3 × 12 · 24 kg", top: "—" },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative flex min-h-screen w-full items-center overflow-hidden">
      {/* Hero background — fills the viewport, centered, covered */}
      <Image
        src={heroImg}
        alt="Lifter performing a barbell row in a dimly lit gym"
        fill
        sizes="100vw"
        placeholder="blur"
        loading="eager"
        className="-z-30 object-cover object-center"
      />
      {/* Legibility overlay */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-r from-background via-background/85 to-background/40"
      />

      {/* Volt glow, top-right */}
      <div
        aria-hidden
        className="animate-aurora-a pointer-events-none absolute -right-28 -top-40 -z-10 size-[38rem] rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="container-page grid w-full items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <motion.div
          variants={container}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "show"}
          className="flex flex-col items-start gap-6"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
          >
            <Lightning weight="fill" className="size-3.5 text-accent" />
            Built for people who actually lift
          </motion.span>

          <motion.h1
            variants={item}
            className="font-display text-5xl italic leading-[0.94] sm:text-6xl lg:text-[4.4rem]"
          >
            LIFT HEAVY.
            <br />
            <span className="tag-skew">LOG FAST.</span>
            <br />
            WATCH STRENGTH
            <br />
            CLIMB.
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-[48ch] text-lg leading-relaxed text-muted-foreground"
          >
            A full session logged in under 30 seconds, then a performance
            dashboard that turns every rep into a trend. No macros, no clutter —
            just the numbers that move you forward.
          </motion.p>

          <motion.div
            variants={item}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a
              href={SIGN_UP_URL}
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-display text-[17px] italic text-accent-foreground transition-[filter] hover:brightness-105 active:translate-y-px"
            >
              Get started free
              <ArrowRight weight="bold" className="size-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3.5 font-mono text-[13px] uppercase tracking-[0.06em] text-foreground transition-colors hover:border-subtle"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p
            variants={item}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.06em] text-subtle"
          >
            <Check weight="bold" className="size-3.5 text-accent" />
            100% free
            <span className="text-border">·</span>
            no card required
            <span className="text-border">·</span>
            no ads
          </motion.p>
        </motion.div>

        {/* Product mock */}
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 28, scale: 0.98 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="relative mx-auto w-full max-w-[20rem]"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="rounded-[1.6rem] border border-border bg-card p-5 shadow-2xl shadow-black/60">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-subtle">
                    Today
                  </p>
                  <p className="font-display text-2xl not-italic">PUSH DAY</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-spark/25 bg-spark/10 px-2.5 py-1.5">
                  <Flame weight="fill" className="size-3.5 text-spark" />
                  <span className="font-mono text-[10px] text-spark-strong">
                    12 DAY
                  </span>
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {EXERCISES.map((ex) => (
                  <li
                    key={ex.name}
                    className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5"
                  >
                    <div>
                      <p className="font-display text-sm not-italic">
                        {ex.name}
                      </p>
                      <p className="font-mono text-[10px] text-subtle">
                        {ex.detail}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        ex.top.startsWith("PR")
                          ? "text-accent"
                          : "text-subtle"
                      }`}
                    >
                      {ex.top}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-subtle">
                  3 exercises · 9 sets
                </span>
                <span className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 font-display text-[13px] italic text-accent-foreground">
                  FINISH
                </span>
              </div>
            </div>
          </motion.div>

          {/* Floating PR badge */}
          <motion.div
            initial={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
            className="absolute -left-2 top-14 hidden sm:block"
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, 9, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="flex items-center gap-2.5 rounded-2xl border border-spark/25 bg-card px-3 py-2.5 shadow-xl shadow-black/50"
            >
              <span className="flex size-[34px] items-center justify-center rounded-lg bg-spark/12 text-spark">
                <TrendUp weight="bold" className="size-[18px]" />
              </span>
              <div className="leading-tight">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-subtle">
                  New PR
                </p>
                <p className="font-display text-[15px] not-italic text-spark">
                  +2.5 kg
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
