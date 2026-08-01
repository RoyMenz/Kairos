import { useEffect, useMemo, useState } from 'react';
import NotificationButton from '../components/NotificationButton.jsx';

const menu = [['▦', 'Dashboard', '/dashboard'], ['◉', 'Employees', '/employees'], ['⌘', 'Workflows', '/workflows'], ['▤', 'Applications', '/applications'], ['☷', 'Logs', '/logs'], ['⚙', 'Settings', '/settings']];
const events = [
  { time: '2026-08-01 14:23:45', icon: '＋', event: 'AWS Seat Provisioned', user: 'jane.doe@enterprise.com', initials: 'JD', admin: 'System (AI)', status: 'Success', action: 'View JSON', app: 'AWS Console' },
  { time: '2026-08-01 14:22:10', icon: '♢', event: 'MFA Reset Requested', user: 'm.smith@enterprise.com', initials: 'MS', admin: 'Alex Chen', status: 'Warning', action: 'Approve', app: 'GitHub Enterprise' },
  { time: '2026-08-01 13:58:12', icon: '⊘', event: 'Deprovision Failed', user: 'r.brown@enterprise.com', initials: 'RB', admin: 'System Flow', status: 'Critical', action: 'Retry', app: 'Slack' },
  { time: '2026-08-01 12:45:00', icon: '⌘', event: 'SSO Login Success', user: 'l.white@enterprise.com', initials: 'LW', admin: 'External', status: 'Success', action: 'Details', app: 'GitHub Enterprise' },
  { time: '2026-08-01 11:15:33', icon: '◉', event: 'Group Sync (Sales)', user: 'Directory Service', initials: 'DS', admin: 'System', status: 'Success', action: 'Logs', app: 'Slack' },
  { time: '2026-08-01 10:02:11', icon: '⚙', event: 'Config Update', user: 'Alex Chen', initials: 'AC', admin: 'Self', status: 'Success', action: 'Diff', app: 'Jira Cloud' },
];

function LogsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState(['Success']);
  const [application, setApplication] = useState('All Applications');
  const [view, setView] = useState('Table');
  useEffect(() => { document.title = 'Logs & Monitoring | PeopleFlow'; }, []);

  const visibleEvents = useMemo(() => events.filter((item) => {
    const textMatch = `${item.event} ${item.user} ${item.admin}`.toLowerCase().includes(query.toLowerCase());
    const statusMatch = statuses.length === 0 || statuses.includes(item.status);
    const appMatch = application === 'All Applications' || item.app === application;
    return textMatch && statusMatch && appMatch;
  }), [query, statuses, application]);

  function toggleStatus(status) { setStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status]); }
  function resetFilters() { setStatuses([]); setApplication('All Applications'); setQuery(''); }

  return <div className="dashboard-page logs-page">
    <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
    <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}><div className="sidebar-brand overview-brand"><i>ϟ</i><div><strong>PeopleFlow</strong><span>Enterprise HR</span></div></div><nav className="side-nav">{menu.map(([icon, label, href]) => <a className={label === 'Logs' ? 'active' : ''} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="user-card"><div className="avatar">AC</div><div><strong>Alex Chen</strong><span>System Admin</span></div></div></aside>
    <header className="topbar logs-topbar"><strong>Event Logs</strong><NotificationButton /></header>

    <main className="logs-main">
      <aside className="logs-filters"><header><h2>Filters</h2><button onClick={resetFilters}>Reset</button></header><section><h3>Status</h3>{['Success', 'Warning', 'Critical'].map((status) => <label key={status}><input type="checkbox" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />{status}</label>)}</section><section><h3>Application</h3><select value={application} onChange={(event) => setApplication(event.target.value)}><option>All Applications</option><option>Slack</option><option>Jira Cloud</option><option>AWS Console</option><option>GitHub Enterprise</option></select></section><section><h3>Date Range</h3><input type="date" /><input type="date" /></section></aside>
      <section className="logs-content"><header className="logs-heading"><div><p>Real-time monitoring of all provisioning and identity actions.</p></div><div className="logs-actions"><div><button className={view === 'Table' ? 'active' : ''} onClick={() => setView('Table')}>☷ Table</button><button className={view === 'Timeline' ? 'active' : ''} onClick={() => setView('Timeline')}>⌁ Timeline</button></div><button>⇩ Export Data</button></div></header>
        {view === 'Table' ? <section className="logs-table-card"><div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Event</th><th>User / Subject</th><th>Admin</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleEvents.map((item) => <tr key={item.time}><td><code>{item.time}</code></td><td><div className={`event-name event-name--${item.status.toLowerCase()}`}><span>{item.icon}</span><strong>{item.event}</strong></div></td><td><div className="log-user"><span>{item.initials}</span>{item.user}</div></td><td>{item.admin}</td><td><b className={`log-status log-status--${item.status.toLowerCase()}`}>{item.status}</b></td><td><button>{item.action}</button></td></tr>)}</tbody></table>{visibleEvents.length === 0 && <div className="empty-directory"><strong>No events match these filters</strong><span>Reset filters to view all activity.</span></div>}</div><footer><span>Showing {visibleEvents.length} of 2,458 events</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></footer></section> : <section className="logs-timeline">{visibleEvents.map((item) => <article key={item.time}><i className={`log-status--${item.status.toLowerCase()}`} /><div><code>{item.time}</code><h3>{item.event}</h3><p>{item.user} · {item.admin}</p></div><b className={`log-status log-status--${item.status.toLowerCase()}`}>{item.status}</b></article>)}</section>}
      </section>
    </main>
    <button className="new-log-button" title="New Manual Log Entry">＋</button>
  </div>;
}

export default LogsPage;
