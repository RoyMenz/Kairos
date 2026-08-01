import { useEffect, useMemo, useState } from 'react';

const menu = [['▦', 'Dashboard', '/dashboard'], ['◉', 'Employees', '/employees'], ['⌘', 'Workflows', '/workflows'], ['▤', 'Applications', '/applications'], ['☷', 'Logs', '/logs'], ['⚙', 'Settings', '/settings']];
const applications = [
  { mark: 'S', name: 'Slack Enterprise', description: 'Internal communication and workflow automation platform.', users: '1,248', status: 'Connected', color: 'var(--color-brand-slack)' },
  { mark: 'G', name: 'Google Workspace', description: 'Productivity suite including Gmail, Drive, and Sheets.', users: '2,850', status: 'Connected', color: 'var(--color-brand-google)' },
  { mark: 'GH', name: 'GitHub', description: 'Version control and collaborative software development.', users: '432', status: 'Needs Re-auth', color: 'var(--color-brand-github)' },
  { mark: 'N', name: 'Notion AI', description: 'Connected workspace for notes, docs, and projects.', users: '892', status: 'Connected', color: 'var(--color-brand-notion)' },
  { mark: 'F', name: 'Figma', description: 'Collaborative interface design tool for teams.', users: '156', status: 'Connected', color: 'var(--color-brand-figma)' },
];

function ApplicationsPage() {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = 'Applications | PeopleFlow'; }, []);
  const visibleApps = useMemo(() => applications.filter((app) => `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="dashboard-page applications-page">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}><div className="sidebar-brand overview-brand"><i>ϟ</i><div><strong>PeopleFlow</strong><span>Enterprise HR</span></div></div><nav className="side-nav">{menu.map(([icon, label, href]) => <a className={label === 'Applications' ? 'active' : ''} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="user-card"><div className="avatar">SJ</div><div><strong>Sarah Jenkins</strong><span>HR Manager</span></div></div></aside>

      <header className="topbar applications-topbar"><strong>Onboarding Workspace</strong><div className="applications-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search applications..." /></div><nav><a href="#provisioning">Provisioning</a><a href="#assets">Assets</a><a href="#security">Security</a></nav><button aria-label="Notifications">♢</button></header>

      <main className="applications-main">
        <section className="applications-heading"><div><h1>Integrated Applications</h1><p>Manage identity provisioning and access control for your enterprise stack.</p></div><button>＋ Connect New App</button></section>
        <aside className="applications-insight"><span>✦</span><div><strong>AI Provisioning Insight</strong><p>You have 12 pending seat requests for <b>Slack Enterprise</b> and 3 users needing re-authentication for <b>GitHub</b>. Automate these flows in your dashboard.</p></div><button>Review Actions</button></aside>

        <section className="applications-grid">{visibleApps.map((app) => <article className="application-card" key={app.name}><header><div className="app-logo" style={{ color: app.color }}>{app.mark}</div><span className={app.status === 'Connected' ? 'connected' : 'reauth'}><i />{app.status}</span></header><h2>{app.name}</h2><p>{app.description}</p><footer><div><small>Active Users</small><strong>{app.users}</strong></div>{app.status === 'Needs Re-auth' ? <button>Fix Connection</button> : <span className="app-arrow">›</span>}</footer></article>)}
          <button className="add-integration"><span>＋</span><strong>Add Integration</strong><p>Connect 500+ other enterprise apps instantly.</p></button>
        </section>
        {visibleApps.length === 0 && <div className="empty-apps"><strong>No applications found</strong><span>Try searching for another integration.</span></div>}

        <footer className="applications-stats"><div><span><small>Total Active Seats</small><strong>5,578</strong></span><span><small>Security Health</small><strong className="healthy">98% Secure</strong></span><span><small>API Latency</small><strong>24ms</strong></span></div><p>System Status: <b>Healthy</b><i /></p></footer>
      </main>
    </div>
  );
}

export default ApplicationsPage;
