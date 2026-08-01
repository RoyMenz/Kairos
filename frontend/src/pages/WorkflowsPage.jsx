import { useEffect, useMemo, useState } from 'react';
const workflows = [
  { icon: '＋', name: 'Standard Engineering Onboarding', apps: 'Slack, GitHub, Jira, AWS', type: 'Onboarding', status: 'Active', triggered: '2026-07-31 09:12 AM' },
  { icon: '⊘', name: 'Immediate Termination Protocol', apps: 'Full Lockout Across 52 Apps', type: 'Offboarding', status: 'Active', triggered: '2026-07-30 04:45 PM' },
  { icon: '♢', name: 'Contractor Access Cycle', apps: 'Time-Limited VPN & Git', type: 'Onboarding', status: 'Paused', triggered: 'Never Triggered' },
  { icon: '⌁', name: 'Marketing Suite Deployment', apps: 'HubSpot, Adobe Cloud, Meta Ads', type: 'Onboarding', status: 'Active', triggered: '2026-07-27 11:00 AM' },
];

function WorkflowsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All Flows');
  useEffect(() => { document.title = 'Workflows | PeopleFlow'; }, []);

  const visibleFlows = useMemo(() => workflows.filter((flow) => {
    const matchesType = filter === 'All Flows' || flow.type === filter;
    const matchesQuery = `${flow.name} ${flow.apps}`.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  }), [filter, query]);

  return (
    <main className="workflows-main workflows-page">
        <section className="workflows-heading"><div><p>Manage automated identity provisioning flows. Orchestrate access across 50+ enterprise applications.</p></div><button>＋ Create New Workflow</button></section>

        <section className="workflows-table-card">
          <header><div>{['All Flows', 'Onboarding', 'Offboarding'].map((name) => <button className={filter === name ? 'active' : ''} onClick={() => setFilter(name)} key={name}>{name}</button>)}</div><button aria-label="More filters">☷</button></header>
          <div className="table-scroll"><table><thead><tr><th>Workflow Name</th><th>Type</th><th>Status</th><th>Last Triggered</th><th /></tr></thead><tbody>{visibleFlows.map((flow) => <tr key={flow.name}><td><div className={`flow-name flow-name--${flow.type.toLowerCase()}`}><span>{flow.icon}</span><div><strong>{flow.name}</strong><small>{flow.apps}</small></div></div></td><td><b className={`flow-type flow-type--${flow.type.toLowerCase()}`}>{flow.type}</b></td><td><div className={`flow-status ${flow.status === 'Paused' ? 'paused' : ''}`}><i />{flow.status}</div></td><td><code>{flow.triggered}</code></td><td><button className="flow-more">⋮</button></td></tr>)}</tbody></table>{visibleFlows.length === 0 && <div className="empty-directory"><strong>No workflows found</strong><span>Try another flow type.</span></div>}</div>
          <footer><span>Showing {visibleFlows.length} of 28 workflows</span><div><button>‹</button><button className="active">1</button><button>2</button><button>›</button></div></footer>
        </section>

        <section className="workflow-summary">{[['ϟ', '1,402', 'Executions this week', 'blue'], ['!', '0', 'Failed workflows', 'red'], ['◷', '1.4s', 'Avg. completion time', 'slate']].map(([icon, value, label, tone]) => <article key={label}><span className={tone}>{icon}</span><div><strong className={tone}>{value}</strong><p>{label}</p></div></article>)}</section>
    </main>
  );
}

export default WorkflowsPage;
