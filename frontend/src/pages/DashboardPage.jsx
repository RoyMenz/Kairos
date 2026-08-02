import { useEffect, useState } from 'react';

function DashboardPage() {
  const [range, setRange] = useState('Last 24 Hours');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeOnboarding: 0,
    completedToday: 0,
    failedTasks: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | PeopleFlow';
    fetchDashboardStats();
    fetchRecentLogs();
  }, []);

  async function fetchRecentLogs() {
    setLogsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch('/api/logs');
      } catch (e) {
        response = await fetch(`${backendUrl}/api/logs`);
      }
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.logs)) {
        setLogs(data.logs.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load recent dashboard logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }

  async function fetchDashboardStats() {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch('/api/dashboard/stats');
      } catch (e) {
        response = await fetch(`${backendUrl}/api/dashboard/stats`);
      }
      const data = await response.json();
      if (response.ok && data.success) {
        setStats({
          totalEmployees: data.totalEmployees || 0,
          activeOnboarding: data.activeOnboarding || 0,
          completedToday: data.completedToday || 0,
          failedTasks: data.failedTasks || 0,
          recentActivity: data.recentActivity || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = [
    { icon: '◉', label: 'Total Employees', value: stats.totalEmployees, badge: 'Team Size' },
    { icon: '↻', label: 'Active Onboarding', value: stats.activeOnboarding, badge: 'In Progress', tone: 'orange' },
    { icon: '✓', label: 'Completed Today', value: stats.completedToday, badge: 'Updated Today' },
    {
      icon: '!',
      label: 'Failed Tasks',
      value: stats.failedTasks,
      badge: stats.failedTasks > 0 ? 'Needs Attention' : 'All Operational',
      tone: 'red',
    },
  ];

  return (
    <>
      <main className="overview-main overview-page">
        <section className="overview-heading">
          <div>
            <h1>Project Overview</h1>
            <p>
              PeopleFlow brings employee onboarding, application access, automated workflows,
              and system activity together in one place for easier HR operations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
        </section>

        <section className="kpi-grid">
          {metrics.map((metric) => (
            <article
              className={`kpi-card ${metric.tone ? `kpi-card--${metric.tone}` : ''}`}
              key={metric.label}
            >
              <div>
                <span className="kpi-icon">{metric.icon}</span>
                <b>{metric.badge}</b>
              </div>
              <p>{metric.label}</p>
              <strong>{loading ? '...' : metric.value}</strong>
            </article>
          ))}
        </section>

        <div className="overview-grid overview-grid--single">
          <div className="overview-primary">
            <section className="activity-card">
              <header>
                <h2>Recent Onboarding Activity</h2>
                <a href="/employees">View all</a>
              </header>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.map((person) => (
                      <tr key={person.email}>
                        <td>
                          <div className="activity-person">
                            <span>{person.initials}</span>
                            <div>
                              <strong>{person.name}</strong>
                              <small>{person.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{person.department}</td>
                        <td>
                          <div className="mini-progress">
                            <i
                              style={{ width: `${person.progress}%` }}
                              className={person.error ? 'error' : ''}
                            />
                          </div>
                        </td>
                        <td>
                          <b
                            className={`activity-status ${
                              person.error
                                ? 'error'
                                : person.progress === 100
                                ? 'complete'
                                : ''
                            }`}
                          >
                            {person.status}
                          </b>
                        </td>
                        <td>⋮</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {loading && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    Fetching live dashboard activity...
                  </div>
                )}

                {!loading && stats.recentActivity.length === 0 && (
                  <div className="empty-directory" style={{ padding: '28px', textAlign: 'center' }}>
                    <strong>No onboarding activity recorded</strong>
                    <span>Add employees to trigger automated provisioning.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="dashboard-logs-card">
              <header>
                <div>
                  <h2>Recent Logs</h2>
                  <p>Latest system and provisioning events</p>
                </div>
                <a href="/logs">View all logs</a>
              </header>

              <div className="dashboard-log-list">
                {logs.map((item) => {
                  const status = (item.status || 'Success').toLowerCase();
                  return (
                    <article key={item.id}>
                      <span className={`dashboard-log-icon dashboard-log-icon--${status}`}>
                        {item.icon || '•'}
                      </span>
                      <div>
                        <strong>{item.event}</strong>
                        <small>{item.user} · {item.admin}</small>
                      </div>
                      <div className="dashboard-log-meta">
                        <code>{item.time}</code>
                        <b className={`log-status log-status--${status}`}>{item.status}</b>
                      </div>
                    </article>
                  );
                })}

                {logsLoading && <p className="dashboard-logs-message">Loading recent logs...</p>}
                {!logsLoading && logs.length === 0 && (
                  <p className="dashboard-logs-message">No system logs available yet.</p>
                )}
              </div>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}

export default DashboardPage;
