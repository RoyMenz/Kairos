import { useEffect, useMemo, useState } from 'react';

const applicationLogos = {
  zoho: 'https://www.zoho.com/sites/zweb/images/commonroot/zoho-logo-web.svg',
  slack: 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png',
  github: 'https://cdn.simpleicons.org/github/181717',
  jira: 'https://cdn.simpleicons.org/jira/0052CC',
};

function getApplicationLogo(name = '') {
  const normalizedName = name.toLowerCase();
  const logoName = Object.keys(applicationLogos).find((key) => normalizedName.includes(key));
  return logoName ? applicationLogos[logoName] : null;
}

function getApplicationLogoName(name = '') {
  const normalizedName = name.toLowerCase();
  return Object.keys(applicationLogos).find((key) => normalizedName.includes(key)) || '';
}

function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
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
                <div
                  className={`app-logo app-logo--${getApplicationLogoName(app.name)}`}
                  style={{ color: app.color, fontWeight: 'bold' }}
                >
                  {getApplicationLogo(app.name) ? (
                    <img
                      src={getApplicationLogo(app.name)}
                      alt={`${app.name} logo`}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.nextElementSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span style={{ display: getApplicationLogo(app.name) ? 'none' : 'block' }}>
                    {app.mark}
                  </span>
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
                  <small>Active Users</small>
                  <strong>{app.users}</strong>
                </div>
                {app.status === 'Needs Re-auth' ? (
                  <button>Fix Connection</button>
                ) : null}
              </footer>
            </article>
          ))}
        </section>
      )}

      {!loading && visibleApps.length === 0 && (
        <div className="empty-apps">
          <strong>No applications found</strong>
          <span>No matching integrations are available.</span>
        </div>
      )}

    </main>
  );
}

export default ApplicationsPage;
