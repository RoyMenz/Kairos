import { useEffect, useState } from 'react';
import NotificationButton from '../components/NotificationButton.jsx';

const employees = [
  { initials: 'MT', name: 'Marcus Thorne', email: 'm.thorne@peopleflow.ai', department: 'Product Design', role: 'Lead Designer', status: 'Active' },
  { initials: 'ER', name: 'Elena Rodriguez', email: 'e.rodriguez@peopleflow.ai', department: 'Engineering', role: 'SRE Engineer', status: 'Provisioning' },
  { initials: 'JS', name: 'Jordan Smith', email: 'j.smith@peopleflow.ai', department: 'Marketing', role: 'CMO', status: 'Active' },
  { initials: 'SC', name: 'Sarah Connor', email: 's.connor@peopleflow.ai', department: 'Operations', role: 'Ops Manager', status: 'Suspended' },
  { initials: 'KS', name: 'Kenji Sato', email: 'k.sato@peopleflow.ai', department: 'Data Science', role: 'AI Researcher', status: 'Active' },
  { initials: 'AW', name: 'Alice Wong', email: 'a.wong@peopleflow.ai', department: 'Sales', role: 'Account Executive', status: 'Provisioning' },
];

const menu = [['▦', 'Dashboard', '/dashboard'], ['◉', 'Employees', '/employees'], ['⌘', 'Workflows', '/workflows'], ['▤', 'Applications', '/applications'], ['☷', 'Logs', '/logs'], ['⚙', 'Settings', '/settings']];

function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState(employees);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = 'Employees Directory | PeopleFlow'; }, []);

  function deleteEmployee(employee) {
    if (window.confirm(`Delete ${employee.name}? This action cannot be undone.`)) {
      setEmployeeList((current) => current.filter((item) => item.email !== employee.email));
    }
  }

  return (
    <div className="dashboard-page employees-page">
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">☰</button>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand overview-brand"><i>ϟ</i><div><strong>PeopleFlow</strong><span>Enterprise HR</span></div></div>
        <nav className="side-nav">{menu.map(([icon, label, href]) => <a className={label === 'Employees' ? 'active' : ''} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav>
        <div className="user-card"><div className="avatar">MC</div><div><strong>Marcus Chen</strong><span>HR Manager</span></div></div>
      </aside>

      <header className="topbar">
        <div><strong>Employees</strong></div>
        <NotificationButton />
      </header>

      <main className="employees-main">
        <section className="directory-heading">
          <div><p>Manage identity provisioning and organizational structure.</p></div>
          <div className="directory-actions"><button onClick={() => { window.location.href = '/employees/new'; }}><span>＋</span> Add Employee</button></div>
        </section>

        <section className="employee-table-card">
          <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{employeeList.map((employee) => <tr key={employee.email}>
              <td><div className="employee-cell"><div className="table-avatar">{employee.initials}</div><div><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td>
              <td>{employee.department}</td><td>{employee.role}</td><td><span className={`status status--${employee.status.toLowerCase()}`}>{employee.status}</span></td>
              <td><div className="row-actions"><button className="view-action" title="View profile" aria-label={`View ${employee.name}'s profile`} onClick={() => setSelectedEmployee(employee)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg></button><button className="delete-action" title="Delete employee" aria-label={`Delete ${employee.name}`} onClick={() => deleteEmployee(employee)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg></button></div></td>
            </tr>)}</tbody>
          </table>{employeeList.length === 0 && <div className="empty-directory"><strong>No employees found</strong><span>Add an employee to build your directory.</span></div>}</div>
          <div className="pagination"><p>Showing {employeeList.length} of 1,284 employees</p><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>›</button></div></div>
        </section>

        <footer className="directory-footer">© 2026 PeopleFlow · Enterprise HR Design System</footer>
      </main>

      {selectedEmployee && <div className="profile-modal-backdrop" role="presentation" onMouseDown={() => setSelectedEmployee(null)}>
        <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="employee-profile-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div className="profile-modal-avatar">{selectedEmployee.initials}</div><div><span>Employee Profile</span><h2 id="employee-profile-title">{selectedEmployee.name}</h2><p>{selectedEmployee.role}</p></div><button className="profile-close" onClick={() => setSelectedEmployee(null)} aria-label="Close profile">×</button></header>
          <div className="profile-status-row"><span className={`status status--${selectedEmployee.status.toLowerCase()}`}>{selectedEmployee.status}</span><small>Identity verified</small></div>
          <div className="profile-details"><article><span>Work Email</span><strong>{selectedEmployee.email}</strong></article><article><span>Department</span><strong>{selectedEmployee.department}</strong></article><article><span>Role</span><strong>{selectedEmployee.role}</strong></article><article><span>Employee ID</span><strong>PF-{selectedEmployee.initials}-2048</strong></article></div>
          <div className="profile-access"><div><span>Access &amp; Provisioning</span><strong>{selectedEmployee.status === 'Provisioning' ? 'Setup in progress' : 'Workspace access enabled'}</strong></div><div className="profile-progress"><i style={{ width: selectedEmployee.status === 'Provisioning' ? '68%' : '100%' }} /></div></div>
          <footer><button onClick={() => setSelectedEmployee(null)}>Close</button></footer>
        </section>
      </div>}
    </div>
  );
}

export default EmployeesPage;
