import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs every hour; the handler fires each user's reminders at their own local
// reminder hour (daily nudge + weekly weigh-in on their local Monday).
crons.hourly(
  "reminders",
  { minuteUTC: 0 },
  internal.notifications.runReminders,
);

export default crons;
