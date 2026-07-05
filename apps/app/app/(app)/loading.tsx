// Shown in the content slot while a route in the (app) group is loading (server
// render, data fetch, or dev on-demand compile). Because this renders INSIDE the
// AppShell layout, the sidebar + bottom nav stay mounted and never flash — only
// the page area shows this neutral steel skeleton until the real page is ready.
export default function AppLoading() {
  return (
    <div className="container-page flex animate-pulse flex-col gap-6 py-8">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-9 w-48 rounded-lg bg-muted" />
      </div>

      {/* A couple of generic card rows that suit any page. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-[14px] border border-border bg-card"
          />
        ))}
      </div>
      <div className="h-40 rounded-[14px] border border-border bg-card" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded-[12px] border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
