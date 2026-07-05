const STATS = [
  { v: "<30s", l: "to log a workout", accent: true, italic: true },
  { v: "$0", l: "100% free", italic: true },
  { v: "∞", l: "workout history", italic: false },
  { v: "0", l: "spreadsheets", italic: true },
];

export function Stats() {
  return (
    <section id="stats" className="container-page scroll-mt-24 py-14">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.1rem] border border-border bg-border sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.l} className="bg-inset p-8 text-center">
            <p
              className={`font-display text-5xl ${
                s.italic ? "italic" : "not-italic"
              } ${s.accent ? "text-accent" : ""}`}
            >
              {s.v}
            </p>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
              {s.l}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
