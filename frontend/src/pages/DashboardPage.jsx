import { useEffect, useState } from 'react';

const menu = [['▦', 'Dashboard', '/dashboard'], ['◉', 'Employees', '/employees'], ['⌘', 'Workflows', '/workflows'], ['▤', 'Applications', '/applications'], ['☷', 'Logs', '/logs'], ['⚙', 'Settings', '/settings']];
const metrics = [
  { icon: '◉', label: 'Total Employees', value: '2,842', badge: '+12%' },
  { icon: '↻', label: 'Active Onboarding', value: '48', badge: 'Active', tone: 'orange' },
  { icon: '✓', label: 'Completed Today', value: '14', badge: '+4 Today' },
  { icon: '!', label: 'Failed Tasks', value: '3', badge: 'Action Required', tone: 'red' },
];
const activity = [
  { initials: 'MB', name: 'Marcus Bennett', email: 'marcus.b@peopleflow.ai', department: 'Engineering', progress: 85, status: 'Provisioning Assets' },
  { initials: 'LC', name: 'Lena Chen', email: 'l.chen@peopleflow.ai', department: 'Design', progress: 40, status: 'Access Blocked', error: true },
  { initials: 'DR', name: 'David Ross', email: 'd.ross@peopleflow.ai', department: 'Sales', progress: 100, status: 'Completed' },
];
const chart = [['Mon', 42, 60], ['Tue', 64, 75], ['Wed', 86, 90], ['Thu', 35, 65], ['Fri', 60, 80], ['Sat', 12, 40], ['Sun', 7, 35]];

function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState('Last 24 Hours');
  useEffect(() => { document.title = 'Dashboard | PeopleFlow'; }, []);

  return (
    <div className="dashboard-page overview-page">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand overview-brand"><i>ϟ</i><div><strong>PeopleFlow</strong><span>Enterprise HR</span></div></div>
        <nav className="side-nav">{menu.map(([icon, label, href]) => <a className={label === 'Dashboard' ? 'active' : ''} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav>
        <div className="user-card"><div className="avatar">SJ</div><div><strong>Sarah Jenkins</strong><span>HR Manager</span></div></div>
      </aside>

      <header className="topbar overview-topbar">
        <nav><a className="active" href="#provisioning">Provisioning</a><a href="#assets">Assets</a><a href="#security">Security</a></nav>
        <div className="overview-actions"><button className="notification" aria-label="Notifications">♢<i /></button></div>
      </header>

      <main className="overview-main">
        <section className="overview-heading"><div><h1>Provisioning Overview</h1><p>Real-time status of enterprise-wide employee lifecycle events.</p></div><div><select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 24 Hours</option><option>Last 7 Days</option><option>Last 30 Days</option></select><button>☷ Filter</button></div></section>

        <section className="kpi-grid">{metrics.map((metric) => <article className={`kpi-card ${metric.tone ? `kpi-card--${metric.tone}` : ''}`} key={metric.label}><div><span className="kpi-icon">{metric.icon}</span><b>{metric.badge}</b></div><p>{metric.label}</p><strong>{metric.value}</strong></article>)}</section>

        <div className="overview-grid">
          <div className="overview-primary">
            <section className="activity-card"><header><h2>Recent Onboarding Activity</h2><a href="/employees">View all</a></header><div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Progress</th><th>Status</th><th /></tr></thead><tbody>{activity.map((person) => <tr key={person.email}><td><div className="activity-person"><span>{person.initials}</span><div><strong>{person.name}</strong><small>{person.email}</small></div></div></td><td>{person.department}</td><td><div className="mini-progress"><i style={{ width: `${person.progress}%` }} className={person.error ? 'error' : ''} /></div></td><td><b className={`activity-status ${person.error ? 'error' : person.progress === 100 ? 'complete' : ''}`}>{person.status}</b></td><td>⋮</td></tr>)}</tbody></table></div></section>

            <section className="workflow-card"><header><h2>Workflow Efficiency</h2><div><span><i /> Provisioning</span><span><i /> Verification</span></div></header><div className="bar-chart">{chart.map(([day, inner, outer]) => <div className="bar-column" key={day}><div className="bar-outer" style={{ height: `${outer}%` }}><i style={{ height: `${inner}%` }} /></div><span>{day}</span></div>)}</div></section>
          </div>

          <aside className="overview-aside">
            <section className="insights-card"><header><span>✦</span><h2>AI Insights</h2></header><article><strong>Bottleneck Detected</strong><p>Cloudflare Access provisioning for Engineering is taking 40% longer than average today.</p><footer><span>Impact: 12 employees</span><button>Investigate</button></footer></article><article className="health"><strong>Provisioning Health</strong><div><b>94.2%</b><span>Standard 99.8%</span></div><p>Verification errors in Finance are skewing global metrics.</p></article></section>
            <section className="bottleneck-card"><h2>Top App Bottlenecks</h2>{[['⌘','GitHub Enterprise','2h 15m avg',85,'red'], ['☵','Slack Workspace','4m avg',10,'blue'], ['▤','NetSuite ERP','45m avg',50,'orange']].map(([icon, name, time, width, tone]) => <div className="app-stat" key={name}><span>{icon}</span><div><p><strong>{name}</strong><small>{time}</small></p><i><b className={tone} style={{ width: `${width}%` }} /></i></div></div>)}<button>Full Infrastructure Report</button></section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
