import { useEffect, useMemo, useState } from 'react';

function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalActiveSeats: '0',
    securityHealth: '100% Secure',
    apiLatency: '18ms',
    systemStatus: 'Healthy',
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Applications | PeopleFlow';
    fetchApplicationsData();
  }, []);

  async function fetchApplicationsData() {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let res;
      try {
        res = await fetch('/api/applications');
      } catch (e) {
        res = await fetch(`${backendUrl}/api/applications`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        setApplications(data.applications);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch applications data from DB backend:', err);
    } finally {
      setLoading(false);
    }
  }

  const visibleApps = useMemo(() => {
    return applications.filter((app) =>
      `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [applications, query]);

  return (
    <main className="applications-main applications-page">
      <section className="applications-heading">
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a' }}>
            Integrated Enterprise Applications
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Manage identity provisioning and live access control across your enterprise stack.
          </p>
        </div>
        <button className="primary-button" onClick={fetchApplicationsData}>
          ↻ Refresh App Connections
        </button>
      </section>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading application metrics from database...
        </div>
      ) : (
        <section className="applications-grid">
          {visibleApps.map((app) => (
            <article className="application-card" key={app.name}>
              <header>
                <div className="app-logo" style={{ color: app.color, fontWeight: 'bold' }}>
                  {app.mark}
                </div>
                <span className={app.status === 'Connected' ? 'connected' : 'reauth'}>
                  <i />
                  {app.status}
                </span>
              </header>
              <h2>{app.name}</h2>
              <p>{app.description}</p>
              <footer>
                <div>
                  <small>Active DB Users</small>
                  <strong>{app.users}</strong>
                </div>
                {app.status === 'Needs Re-auth' ? (
                  <button>Fix Connection</button>
                ) : (
                  <span className="app-arrow">›</span>
                )}
              </footer>
            </article>
          ))}
          <button className="add-integration">
            <span>＋</span>
            <strong>Add Integration</strong>
            <p>Connect 500+ other enterprise apps instantly.</p>
          </button>
        </section>
      )}

      {!loading && visibleApps.length === 0 && (
        <div className="empty-apps">
          <strong>No applications found</strong>
          <span>No matching integrations are available.</span>
        </div>
      )}

      <footer className="applications-stats">
        <div>
          <span>
            <small>Total Active Seats</small>
            <strong>{stats.totalActiveSeats}</strong>
          </span>
          <span>
            <small>Security Health</small>
            <strong className="healthy">{stats.securityHealth}</strong>
          </span>
          <span>
            <small>API Latency</small>
            <strong>{stats.apiLatency}</strong>
          </span>
        </div>
        <p>
          System Status: <b>{stats.systemStatus}</b>
          <i />
        </p>
      </footer>
    </main>
  );
}

export default ApplicationsPage;
