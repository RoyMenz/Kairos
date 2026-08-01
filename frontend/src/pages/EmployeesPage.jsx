import { useEffect, useMemo, useState } from 'react';

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
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = 'Employees Directory | PeopleFlow'; }, []);

  const filteredEmployees = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => Object.values(employee).some((value) => value.toLowerCase().includes(term)));
  }, [query]);

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
      </header>

      <main className="employees-main">
        <section className="directory-heading">
          <div><p>Manage identity provisioning and organizational structure.</p></div>
          <div className="directory-actions"><button onClick={() => { window.location.href = '/employees/new'; }}><span>＋</span> Add Employee</button></div>
        </section>

        <section className="employee-table-card">
          <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredEmployees.map((employee) => <tr key={employee.email}>
              <td><div className="employee-cell"><div className="table-avatar">{employee.initials}</div><div><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td>
              <td>{employee.department}</td><td>{employee.role}</td><td><span className={`status status--${employee.status.toLowerCase()}`}>{employee.status}</span></td>
              <td><div className="row-actions"><button title="View profile">◉</button><button title="Edit employee">✎</button><button title="Deactivate employee">⊘</button></div></td>
            </tr>)}</tbody>
          </table>{filteredEmployees.length === 0 && <div className="empty-directory"><strong>No employees found</strong><span>Try a different name, role, or department.</span></div>}</div>
          <div className="pagination"><p>Showing {filteredEmployees.length} of 1,284 employees</p><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>›</button></div></div>
        </section>

        <footer className="directory-footer">© 2026 PeopleFlow · Enterprise HR Design System</footer>
      </main>
    </div>
  );
}

export default EmployeesPage;
