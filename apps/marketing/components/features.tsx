"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  Lightning,
  ChartLineUp,
  Scales,
  TrendUp,
} from "@phosphor-icons/react";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const CHART = [
  { h: 35, c: "#2a2a30" },
  { h: 52, c: "#3a4a1e" },
  { h: 44, c: "#3a4a1e" },
  { h: 68, c: "#6f8a2e" },
  { h: 60, c: "#6f8a2e" },
  { h: 82, c: "var(--accent)", o: 0.8 },
  { h: 100, c: "var(--accent)" },
];

export function Features() {
  const reduce = useReducedMotion();
  return (
    <section id="features" className="container-page scroll-mt-20 py-16 sm:py-20">
      <div className="max-w-[620px]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
          The whole product
        </p>
        <h2 className="mt-3.5 font-display text-4xl italic leading-[0.98] sm:text-[2.9rem]">
          EVERYTHING YOU NEED.
          <br />
          NOTHING YOU DON&apos;T.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Three screens, one job: get you in, logged, and back to your day —
          while quietly building the record of your progress.
        </p>
      </div>

      <motion.div
        variants={container}
        initial={reduce ? undefined : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, margin: "-80px" }}
        className="mt-11 grid gap-3.5 md:grid-cols-[2fr_1fr]"
      >
        <Card reduce={reduce}>
          <Chip>
            <Lightning weight="bold" className="size-6" />
          </Chip>
          <Title>Log in seconds</Title>
          <Body className="max-w-[44ch]">
            Add exercises, tap in your sets, done. The fastest log in fitness —
            with a rest timer that starts itself and your best weight
            pre-filled.
          </Body>
          <div className="mt-5 flex flex-col gap-2">
            {[
              ["Bench Press", "Set 1", "8 × 80", false],
              ["Bench Press", "Set 2", "8 × 82.5", true],
            ].map(([n, s, v, hit], i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[10px] border border-border bg-inset px-3.5 py-2.5 text-[13px]"
              >
                <span className="font-display not-italic" style={{ fontWeight: 700 }}>
                  {n}
                </span>
                <span className="font-mono text-[11px] text-subtle">{s}</span>
                <span
                  className={`font-mono tabular-nums ${
                    hit ? "text-accent" : ""
                  }`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card reduce={reduce}>
          <Chip>
            <ChartLineUp weight="bold" className="size-6" />
          </Chip>
          <Title>Watch progress climb</Title>
          <Body>
            Weekly volume and strength trends turn effort into a line that goes
            up.
          </Body>
          <div className="mt-auto flex h-20 items-end gap-1.5 pt-5">
            {CHART.map((b, i) => (
              <span
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${b.h}%`,
                  background: b.c,
                  opacity: b.o,
                }}
              />
            ))}
          </div>
        </Card>

        <Card reduce={reduce}>
          <Chip>
            <Scales weight="bold" className="size-6" />
          </Chip>
          <Title>A simple body journal</Title>
          <Body>
            Log weight and measurements whenever you want. No pressure — just a
            clean record.
          </Body>
        </Card>

        <Card reduce={reduce}>
          <Chip>
            <TrendUp weight="bold" className="size-6" />
          </Chip>
          <Title>Beat your best</Title>
          <Body className="max-w-[52ch]">
            Every set shows a live +/- against your all-time best for that lift,
            so you always know when you&apos;re setting a new record.
          </Body>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {[
              ["Squat", "+5"],
              ["Deadlift", "+2.5"],
              ["Bench", "−2.5"],
              ["Row", "PR"],
            ].map(([n, d], i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-inset px-3.5 py-2 text-[13px] font-display not-italic"
                style={{ fontWeight: 700 }}
              >
                {n}
                <span
                  className={`font-mono font-semibold ${
                    d.startsWith("−") ? "text-[#ff6b6b]" : "text-accent"
                  }`}
                >
                  {d}
                </span>
              </span>
            ))}
          </div>
        </Card>
      </motion.div>
    </section>
  );
}

function Card({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-[20px] border border-border bg-card p-[26px] transition-colors hover:border-accent/35"
    >
      {children}
    </motion.div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-[46px] items-center justify-center rounded-xl bg-accent/10 text-accent">
      {children}
    </span>
  );
}
function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mt-[18px] font-display text-[22px] not-italic tracking-[-0.02em]"
      style={{ fontWeight: 800 }}
    >
      {children}
    </h3>
  );
}
function Body({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-2 text-sm leading-relaxed text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}
