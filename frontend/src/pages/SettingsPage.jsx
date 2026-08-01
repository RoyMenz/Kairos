import { useEffect, useState } from 'react';
import NotificationButton from '../components/NotificationButton.jsx';

const menu = [['▦', 'Dashboard', '/dashboard'], ['◉', 'Employees', '/employees'], ['⌘', 'Workflows', '/workflows'], ['▤', 'Applications', '/applications'], ['☷', 'Logs', '/logs'], ['⚙', 'Settings', '/settings']];
const settingTabs = ['General', 'Security & SSO', 'Notifications', 'Billing & Usage', 'API Keys'];
const notificationRows = [
  ['New Employee Detected', 'When HRIS syncs a new hire.'],
  ['Provisioning Error', 'Critical failures in account creation.'],
  ['Security Alert', 'New SSO login from an unrecognized device.'],
];

function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('General');
  const [company, setCompany] = useState('Acme Corp Global');
  const [domain, setDomain] = useState('acme.com');
  const [timezone, setTimezone] = useState('PST (Pacific Standard Time)');
  const [mfa, setMfa] = useState(true);
  const [session, setSession] = useState('4 Hours');
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState([[true, true, false], [true, true, true], [true, true, true]]);
  useEffect(() => { document.title = 'Settings | PeopleFlow'; }, []);

  function selectTab(tab) {
    setActiveTab(tab);
    const target = { General: 'general-settings', 'Security & SSO': 'security-settings', Notifications: 'notification-settings' }[tab];
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function saveSettings() { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }
  function toggleNotification(row, column) { setNotifications((current) => current.map((values, index) => index === row ? values.map((value, itemIndex) => itemIndex === column ? !value : value) : values)); }

  return <div className="dashboard-page settings-page">
    <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
    <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}><div className="sidebar-brand overview-brand"><i>ϟ</i><div><strong>PeopleFlow</strong><span>Enterprise HR</span></div></div><nav className="side-nav">{menu.map(([icon, label, href]) => <a className={label === 'Settings' ? 'active' : ''} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="user-card"><div className="avatar">JD</div><div><strong>John Doe</strong><span>admin@peopleflow.com</span></div></div></aside>
    <header className="topbar settings-topbar"><strong>Organization Settings</strong><NotificationButton /></header>

    <main className="settings-main"><header className="settings-heading"><p>Manage your enterprise environment, security policies, and automation triggers.</p></header>
      <div className="settings-layout"><aside className="settings-tabs">{settingTabs.map((tab) => <button className={activeTab === tab ? 'active' : ''} onClick={() => selectTab(tab)} key={tab}><span>{tab}</span><b>›</b></button>)}</aside>
        <div className="settings-content">
          <section className="settings-card" id="general-settings"><header><h2>General Profile</h2><button onClick={saveSettings}>{saved ? '✓ Saved' : 'Save Changes'}</button></header><div className="general-grid"><div className="settings-fields"><label>Company Name<input value={company} onChange={(event) => setCompany(event.target.value)} /></label><label>Primary Domain<input value={domain} onChange={(event) => setDomain(event.target.value)} /></label><label>Timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>UTC (Coordinated Universal Time)</option><option>PST (Pacific Standard Time)</option><option>EST (Eastern Standard Time)</option></select></label></div><div className="logo-upload"><label>Company Logo</label><button><span>▧</span>Upload Image</button><p>PNG or SVG format. Max 5MB.<br />Recommended 512×512px.</p></div></div></section>
          <section className="settings-card" id="security-settings"><h2>Security &amp; Identity</h2><div className="security-row"><span>⌾</span><div><h3>Multi-Factor Authentication (MFA)</h3><p>Enforce MFA for all administrative accounts.</p></div><label className="switch"><input type="checkbox" checked={mfa} onChange={() => setMfa(!mfa)} /><i /></label></div><div className="security-row"><span>⌘</span><div><h3>Single Sign-On (SSO)</h3><p>Okta, Microsoft Entra ID, or SAML 2.0.</p></div><button>Configure</button></div><div className="security-row"><span className="danger">◷</span><div><h3>Session Expiration</h3><p>Log out users after a period of inactivity.</p></div><select value={session} onChange={(event) => setSession(event.target.value)}><option>1 Hour</option><option>4 Hours</option><option>8 Hours</option><option>24 Hours</option></select></div></section>
          <section className="settings-card notification-settings" id="notification-settings"><h2>Notification Preferences</h2><div className="table-scroll"><table><thead><tr><th>Category</th><th>In-App</th><th>Email</th><th>Slack</th></tr></thead><tbody>{notificationRows.map(([title, description], row) => <tr key={title}><td><strong>{title}</strong><small>{description}</small></td>{notifications[row].map((enabled, column) => <td key={column}><input type="checkbox" checked={enabled} onChange={() => toggleNotification(row, column)} /></td>)}</tr>)}</tbody></table></div></section>
        </div>
      </div>
    </main>
    {saved && <div className="settings-toast">✓ Organization settings saved</div>}
  </div>;
}

export default SettingsPage;
