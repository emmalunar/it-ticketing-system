export default function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="loading-layout">
      <p className="sr-only" role="status">
        Connecting to the service desk…
      </p>
      <div aria-hidden="true" className="loading-sidebar">
        <div className="skeleton loading-brand" />
        <div className="skeleton loading-nav" />
        <div className="skeleton loading-nav" />
        <div className="skeleton loading-nav" />
        <div className="skeleton loading-profile" />
      </div>
      <div aria-hidden="true" className="loading-main">
        <div className="loading-topbar" />
        <div className="loading-content">
          <div className="skeleton loading-title" />
          <div className="skeleton loading-subtitle" />
          <div className="skeleton loading-hero" />
          <div className="loading-stats">
            <div className="skeleton loading-stat" />
            <div className="skeleton loading-stat" />
            <div className="skeleton loading-stat" />
            <div className="skeleton loading-stat" />
          </div>
          <div className="skeleton loading-panel" />
        </div>
      </div>
    </div>
  );
}
