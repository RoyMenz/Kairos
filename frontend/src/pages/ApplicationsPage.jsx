import { useEffect, useMemo, useState } from 'react';
const applications = [
  { mark: 'S', name: 'Slack Enterprise', description: 'Internal communication and workflow automation platform.', users: '1,248', status: 'Connected', color: 'var(--color-brand-slack)' },
  { mark: 'G', name: 'Google Workspace', description: 'Productivity suite including Gmail, Drive, and Sheets.', users: '2,850', status: 'Connected', color: 'var(--color-brand-google)' },
  { mark: 'GH', name: 'GitHub', description: 'Version control and collaborative software development.', users: '432', status: 'Needs Re-auth', color: 'var(--color-brand-github)' },
];

function ApplicationsPage() {
  const [query, setQuery] = useState('');
  useEffect(() => { document.title = 'Applications | PeopleFlow'; }, []);
  const visibleApps = useMemo(() => applications.filter((app) => `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <main className="applications-main applications-page">
        <section className="applications-heading"><div><p>Manage identity provisioning and access control for your enterprise stack.</p></div><button>＋ Connect New App</button></section>

        <section className="applications-grid">{visibleApps.map((app) => <article className="application-card" key={app.name}><header><div className="app-logo" style={{ color: app.color }}>{app.mark}</div><span className={app.status === 'Connected' ? 'connected' : 'reauth'}><i />{app.status}</span></header><h2>{app.name}</h2><p>{app.description}</p><footer><div><small>Active Users</small><strong>{app.users}</strong></div>{app.status === 'Needs Re-auth' ? <button>Fix Connection</button> : <span className="app-arrow">›</span>}</footer></article>)}
          <button className="add-integration"><span>＋</span><strong>Add Integration</strong><p>Connect 500+ other enterprise apps instantly.</p></button>
        </section>
        {visibleApps.length === 0 && <div className="empty-apps"><strong>No applications found</strong><span>No integrations are available.</span></div>}

        <footer className="applications-stats"><div><span><small>Total Active Seats</small><strong>5,578</strong></span><span><small>Security Health</small><strong className="healthy">98% Secure</strong></span><span><small>API Latency</small><strong>24ms</strong></span></div><p>System Status: <b>Healthy</b><i /></p></footer>
    </main>
  );
}

export default ApplicationsPage;
