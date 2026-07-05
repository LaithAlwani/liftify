import { httpRouter } from "convex/server";

// Liftify is free — no billing webhooks. Kept as an empty router so Convex has
// a valid http entrypoint if routes are added later.
const http = httpRouter();

export default http;
