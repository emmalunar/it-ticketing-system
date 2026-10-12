export default function DashboardSkeleton() {
  return (
    <main aria-busy="true" className="app-shell loading-screen min-h-screen">
      <p className="sr-only" role="status">Connecting to the service desk…</p>
      <div aria-hidden="true" className="loading-layout">
        <aside className="loading-sidebar">
          <div className="loading-skeleton loading-brand" />
          <div className="loading-skeleton loading-nav" />
          <div className="loading-skeleton loading-nav" />
          <div className="loading-skeleton loading-profile" />
        </aside>
        <section className="loading-main">
          <header className="loading-header">
            <div>
              <div className="loading-skeleton loading-eyebrow" />
              <div className="loading-skeleton loading-title" />
            </div>
            <div className="loading-skeleton loading-action" />
          </header>
          <div className="loading-content">
            <div className="loading-skeleton loading-hero" />
            <div className="loading-metrics">
              <div className="loading-skeleton loading-metric" />
              <div className="loading-skeleton loading-metric" />
              <div className="loading-skeleton loading-metric" />
              <div className="loading-skeleton loading-metric" />
            </div>
            <div className="loading-skeleton loading-panel" />
          </div>
        </section>
      </div>
    </main>
  );
}
