import { useEffect, useState } from 'react';

const navItems = [
  ['◉', 'Employees'], ['▦', 'Dashboard'], ['⌘', 'Workflows'],
  ['▤', 'Applications'], ['☷', 'Logs'], ['⚙', 'Settings'],
];

function DashboardPage() {
  const [employee, setEmployee] = useState({ name: '', email: '', department: '', role: '', manager: '', joiningDate: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { document.title = 'Employee Onboarding | PeopleFlow'; }, []);

  function updateField(event) {
    setEmployee((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setShowSuccess(true);
  }

  return (
    <div className="dashboard-page">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand"><strong>PeopleFlow</strong><span>Enterprise HR</span></div>
        <nav className="side-nav">
          {navItems.map(([icon, label], index) => <a className={index === 0 ? 'active' : ''} href={`#${label.toLowerCase()}`} key={label}><span>{icon}</span>{label}</a>)}
        </nav>
        <div className="user-card">
          <div className="avatar">MC</div>
          <div><strong>Marcus Chen</strong><span>HR Manager</span></div>
        </div>
      </aside>

      <header className="topbar">
        <div><strong>Onboarding Workspace</strong><nav><a href="#provisioning">Provisioning</a><a href="#assets">Assets</a><a href="#security">Security</a></nav></div>
        <div className="top-actions"><button aria-label="Notifications">♢</button><span /><button>Help</button><button className="sign-out" onClick={() => { window.location.href = '/login'; }}>Sign out</button></div>
      </header>

      <main className="dashboard-main">
        <div className="page-heading">
          <div><p>Employees <span>›</span> Add New Employee</p><h1>Create Employee Profile</h1></div>
          <div className="stepper">
            <div className="step active"><b>1</b><span>Details</span></div><i />
            <div className="step"><b>2</b><span>Hardware</span></div><i />
            <div className="step"><b>3</b><span>Review</span></div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="form-column">
            <section className="employee-form-card">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label>Full Name<input name="name" value={employee.name} onChange={updateField} placeholder="e.g. Sarah Jenkins" required /></label>
                  <label>Work Email<input name="email" value={employee.email} onChange={updateField} placeholder="sarah.j@company.com" type="email" required /><small>ⓘ Domain verified for provisioning.</small></label>
                  <label>Department<select name="department" value={employee.department} onChange={updateField} required><option value="" disabled>Select department</option><option>Engineering</option><option>Product Management</option><option>Sales &amp; Marketing</option><option>Customer Success</option><option>Design</option></select></label>
                  <label>Role<input name="role" value={employee.role} onChange={updateField} placeholder="e.g. Senior Software Engineer" required /></label>
                  <label>Direct Manager<input name="manager" value={employee.manager} onChange={updateField} placeholder="Search managers..." /></label>
                  <label>Joining Date<input name="joiningDate" value={employee.joiningDate} onChange={updateField} type="date" required /></label>
                </div>
                <div className="form-actions">
                  <button className="secondary-button" type="button">Save as Draft</button>
                  <div><button className="text-button" type="reset">Cancel</button><button className="primary-button" type="submit">Generate AI Workflow <span>✦</span></button></div>
                </div>
              </form>
            </section>
            <aside className="ai-recommendation"><span>💡</span><div><strong>AI Provisioning Recommendation</strong><p>Based on the selected department, PeopleFlow will suggest appropriate hardware, application access, and team channels. Estimated setup time: <b>14 minutes</b>.</p></div></aside>
          </div>

          <aside className="preview-card">
            <p className="card-label">Profile Preview</p>
            <div className="profile-preview"><div className="large-avatar">{employee.name ? employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : '＋'}</div><h2>{employee.name || 'New Hire'}</h2><p>{employee.role || 'Role not specified'}</p></div>
            <div className="accuracy"><div><span>Data Accuracy</span><strong>High (92%)</strong></div><div className="progress"><span /></div></div>
            <blockquote>“Streamlining onboarding through automated identity management.”</blockquote>
          </aside>
        </div>
      </main>

      {showSuccess && <div className="success-overlay" role="dialog" aria-modal="true"><div className="success-dialog"><div className="success-check">✓</div><h2>Workflow Generated</h2><p>The onboarding sequence for {employee.name || 'the new employee'} has been initiated. Hardware procurement and account provisioning are now in progress.</p><button onClick={() => setShowSuccess(false)}>Return to Dashboard</button></div></div>}
    </div>
  );
}

export default DashboardPage;
