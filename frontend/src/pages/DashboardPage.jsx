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

  useEffect(() => {
    document.title = 'Dashboard | PeopleFlow';
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
    { icon: '◉', label: 'Total Employees', value: stats.totalEmployees, badge: 'Live DB' },
    { icon: '↻', label: 'Active Onboarding', value: stats.activeOnboarding, badge: 'In Progress', tone: 'orange' },
    { icon: '✓', label: 'Completed Today', value: stats.completedToday, badge: 'Updated Today' },
    { icon: '!', label: 'Failed Tasks', value: stats.failedTasks, badge: 'All Operational', tone: 'red' },
  ];

  const chart = [
    ['Mon', 42, 60],
    ['Tue', 64, 75],
    ['Wed', 86, 90],
    ['Thu', 35, 65],
    ['Fri', 60, 80],
    ['Sat', 12, 40],
    ['Sun', 7, 35],
  ];

  return (
    <>
      <main className="overview-main overview-page">
        <section className="overview-heading">
          <div>
            <p>Real-time status of enterprise-wide employee lifecycle events from Supabase &amp; Gemini LLM.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
            <button onClick={fetchDashboardStats} title="Refresh live statistics">
              ↻ Refresh DB
            </button>
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

        <div className="overview-grid">
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

            <section className="workflow-card">
              <header>
                <h2>Workflow Efficiency</h2>
                <div>
                  <span>
                    <i /> Provisioning
                  </span>
                  <span>
                    <i /> Verification
                  </span>
                </div>
              </header>
              <div className="bar-chart">
                {chart.map(([day, inner, outer]) => (
                  <div className="bar-column" key={day}>
                    <div className="bar-outer" style={{ height: `${outer}%` }}>
                      <i style={{ height: `${inner}%` }} />
                    </div>
                    <span>{day}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="overview-aside">
            <section className="bottleneck-card">
              <h2>Top App Provisioning Metrics</h2>
              {[
                ['⌘', 'GitHub Enterprise', 'Access Provisioned', 100, 'blue'],
                ['☵', 'Slack Workspace', 'Invite Emailed', 90, 'blue'],
                ['☁', 'Google Workspace', 'Account Active', 100, 'blue'],
                ['▤', 'Jira Software', 'Role Assigned', 85, 'blue'],
              ].map(([icon, name, statusText, width, tone]) => (
                <div className="app-stat" key={name}>
                  <span>{icon}</span>
                  <div>
                    <p>
                      <strong>{name}</strong>
                      <small>{statusText}</small>
                    </p>
                    <i>
                      <b className={tone} style={{ width: `${width}%` }} />
                    </i>
                  </div>
                </div>
              ))}
              <button onClick={() => { window.location.href = '/workflows'; }}>
                View Full Workflows Report
              </button>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}

export default DashboardPage;
