"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Users, UserPlus, Pulse, Barbell } from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

const VOLT = "#d7f24a";

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function AdminOverview() {
  const overview = useQuery(api.admin.overview, {});
  const signups = useQuery(api.admin.signupsSeries, { days: 30 });
  const engagement = useQuery(api.admin.engagement, {});

  const signupData = (signups ?? []).map((d) => ({
    label: new Date(d.day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    count: d.count,
  }));

  const funnel = engagement?.onboarding;
  const totalUsers = engagement?.totalUsers ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Insights" title="Overview" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={overview?.totalUsers ?? "—"}
          icon={<Users weight="bold" className="size-3" />}
        />
        <StatCard
          label="New · 7d"
          value={overview?.new7d ?? "—"}
          icon={<UserPlus weight="bold" className="size-3" />}
        />
        <StatCard
          label="Active · 7d"
          value={overview?.active7d ?? "—"}
          icon={<Pulse weight="bold" className="size-3" />}
          variant="spark"
        />
        <StatCard
          label="Workouts"
          value={overview?.totalWorkouts ?? "—"}
          icon={<Barbell weight="bold" className="size-3" />}
        />
      </div>

      <Card className="p-4 lg:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="mono-label text-label text-muted-foreground">
            Signups · last 30 days
          </span>
          <span className="font-mono text-label-lg text-muted-foreground">
            {overview?.newToday ?? 0} today · {overview?.new30d ?? 0} this month
          </span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signupData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8a8a92" }}
                interval={6}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#141417",
                  border: "1px solid #26262b",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8a8a92" }}
              />
              <Bar dataKey="count" fill={VOLT} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <span className="mono-label text-label text-muted-foreground">
            Onboarding funnel
          </span>
          {funnel && (
            <div className="flex flex-col gap-3">
              {(
                [
                  { label: "Completed", value: funnel.completed, tone: "bg-accent" },
                  { label: "Skipped", value: funnel.skipped, tone: "bg-spark" },
                  { label: "Not started", value: funnel.neither, tone: "bg-steel" },
                ] as const
              ).map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-display font-black tabular-nums">
                      {row.value}{" "}
                      <span className="text-label-lg text-dim">
                        ({pct(row.value, totalUsers)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${pct(row.value, totalUsers)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col justify-center gap-2 p-5">
          <span className="mono-label text-label text-muted-foreground">
            Push opt-in
          </span>
          <p className="font-display text-4xl font-black">
            {engagement?.pushOptIn ?? 0}
            <span className="text-lg text-dim">
              {" "}
              / {totalUsers} users
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {pct(engagement?.pushOptIn ?? 0, totalUsers)}% have enabled push
            notifications on at least one device.
          </p>
        </Card>
      </div>
    </div>
  );
}
