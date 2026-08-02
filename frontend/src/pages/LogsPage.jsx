import { useEffect, useMemo, useState } from 'react';

function LogsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [application, setApplication] = useState('All Applications');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    document.title = 'Logs & Monitoring | PeopleFlow';
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let res;
      try {
        res = await fetch('/api/logs');
      } catch (e) {
        res = await fetch(`${backendUrl}/api/logs`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setEvents(data.logs);
      }
    } catch (err) {
      console.error('Failed to load system logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const visibleEvents = useMemo(() => {
    return events.filter((item) => {
      const textMatch = `${item.event} ${item.user} ${item.admin} ${item.app || ''}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const appMatch = application === 'All Applications' || item.app === application;

      let dateMatch = true;
      if (startDate || endDate) {
        const eventDate = item.time ? item.time.split(' ')[0] : '';
        if (startDate && eventDate < startDate) dateMatch = false;
        if (endDate && eventDate > endDate) dateMatch = false;
      }

      return textMatch && appMatch && dateMatch;
    });
  }, [events, query, application, startDate, endDate]);

  function resetFilters() {
    setApplication('All Applications');
    setStartDate('');
    setEndDate('');
    setQuery('');
  }

  function exportLogs() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(visibleEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <main className="logs-main logs-page">
      <aside className="logs-filters">
        <header>
          <h2>Filters</h2>
          <button onClick={resetFilters}>Reset</button>
        </header>

        <section>
          <h3>Search Query</h3>
          <input
            type="text"
            placeholder="Search logs by keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px' }}
          />
        </section>

        <section>
          <h3>Application</h3>
          <select value={application} onChange={(event) => setApplication(event.target.value)}>
            <option>All Applications</option>
            <option>Zoho Workplace</option>
            <option>Slack Enterprise</option>
            <option>GitHub Enterprise</option>
            <option>Jira Software</option>
            <option>System Flow</option>
          </select>
        </section>

        <section>
          <h3>Date Range</h3>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </section>
      </aside>

      <section className="logs-content">
        <header className="logs-heading">
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a' }}>
              Real-Time Audit Logs &amp; Monitoring
            </h1>
            <p style={{ margin: 0, color: '#64748b' }}>
              Real-time monitoring of all provisioning, AI role decisions, and access control events.
            </p>
          </div>
          <div className="logs-actions">
            <button onClick={exportLogs}>⇩ Export Data</button>
          </div>
        </header>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading audit log events from database...
          </div>
        ) : (
          <section className="logs-table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>User / Subject</th>
                    <th>Admin / Source</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code>{item.time}</code>
                      </td>
                      <td>
                        <div className={`event-name event-name--${item.status.toLowerCase()}`}>
                          <strong>{item.event}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="log-user">
                          <span>{item.initials}</span>
                          {item.user}
                        </div>
                      </td>
                      <td>{item.admin}</td>
                      <td>
                        <b className={`log-status log-status--${item.status.toLowerCase()}`}>
                          {item.status}
                        </b>
                      </td>
                      <td>
                        <button onClick={() => alert(`Log Details:\n\nTimestamp: ${item.time}\nEvent: ${item.event}\nUser: ${item.user}\nApp: ${item.app}\nSource: ${item.admin}`)}>
                          {item.action || 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleEvents.length === 0 && (
                <div className="empty-directory" style={{ padding: '32px', textAlign: 'center' }}>
                  <strong>No events match these filters</strong>
                  <span>Reset filters to view all activity logs.</span>
                </div>
              )}
            </div>
            <footer>
              <span>Showing {visibleEvents.length} of {events.length} system events</span>
            </footer>
          </section>
        )}
      </section>
    </main>
  );
}

export default LogsPage;
