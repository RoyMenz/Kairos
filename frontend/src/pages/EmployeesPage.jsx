import { useEffect, useState } from 'react';

function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [offboardConfirm, setOffboardConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Employees Directory | PeopleFlow';
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch('/api/employees');
      } catch (e) {
        response = await fetch(`${backendUrl}/api/employees`);
      }
      const data = await response.json();
      if (response.ok && data.employees) {
        setEmployeeList(data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }

  async function retryProvisioning(employee, platform = 'all') {
    const empId = employee.employee_id || employee.email;
    setActionLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch(`/api/employees/${encodeURIComponent(empId)}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
        });
      } catch (e) {
        response = await fetch(`${backendUrl}/api/employees/${encodeURIComponent(empId)}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
        });
      }
      const data = await response.json();
      if (response.ok) {
        setNotice(data.message || 'Retry executed successfully');
        await fetchEmployees();
      }
    } catch (err) {
      console.error('Failed to retry provisioning:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function executeOffboarding(employee) {
    const empId = employee.employee_id || employee.email;
    setActionLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch(`/api/employees/${encodeURIComponent(empId)}/offboard`, {
          method: 'POST',
        });
      } catch (e) {
        response = await fetch(`${backendUrl}/api/employees/${encodeURIComponent(empId)}/offboard`, {
          method: 'POST',
        });
      }
      const data = await response.json();
      if (response.ok) {
        setNotice(data.message || 'Employee offboarded successfully');
        setOffboardConfirm(null);
        setSelectedEmployee(null);
        await fetchEmployees();
      }
    } catch (err) {
      console.error('Offboarding failed:', err);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteEmployee(employee) {
    const empId = employee.employee_id || employee.email;
    if (window.confirm(`Delete ${employee.name} (${empId})? This action cannot be undone.`)) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        try {
          await fetch(`/api/employees/${encodeURIComponent(empId)}`, { method: 'DELETE' });
        } catch (e) {
          await fetch(`${backendUrl}/api/employees/${encodeURIComponent(empId)}`, { method: 'DELETE' });
        }
        setEmployeeList((current) => current.filter((item) => (item.employee_id || item.email) !== empId));
      } catch (err) {
        console.error('Failed to delete employee:', err);
      }
    }
  }

  return (
    <>
      <main className="employees-main employees-page">
        <section className="directory-heading">
          <div>
            <h1>Employee Directory</h1>
            <p>Manage identity provisioning, platform access, and offboarding workflows.</p>
          </div>
          <div className="directory-actions">
            <button
              onClick={() => {
                window.location.href = '/employees/new';
              }}
            >
              <span>＋</span> Add Employee
            </button>
          </div>
        </section>

        {notice && (
          <div className="directory-notice">
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}

        <section className="employee-table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Platform Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeeList.map((employee) => {
                  const statusLower = (employee.status || 'Active').toLowerCase();
                  return (
                    <tr key={employee.employee_id || employee.email}>
                      <td>
                        <span className="employee-id-badge">
                          {employee.employee_id || 'KS001'}
                        </span>
                      </td>
                      <td>
                        <div className="employee-cell">
                          <div className="table-avatar">
                            {employee.initials ||
                              employee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                          </div>
                          <div>
                            <strong>{employee.name}</strong>
                            <span>{employee.work_email || employee.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{employee.department || 'Engineering'}</td>
                      <td>{employee.role}</td>
                      <td>
                        <div className="platform-badges">
                          <span>
                            Zoho: {employee.zoho_zuid ? '✓' : '…'}
                          </span>
                          <span>
                            Slack: {employee.slack_user_id ? '✓' : '…'}
                          </span>
                          <span>
                            GH: {employee.github_username ? '✓' : employee.github_invitation_id ? 'Inv' : '…'}
                          </span>
                          <span>
                            Jira: {employee.jira_account_id ? '✓' : '…'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status status--${statusLower}`}>
                          {employee.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions" style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="view-action"
                            title="View profile & platform IDs"
                            onClick={() => setSelectedEmployee(employee)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                          </button>

                          {statusLower !== 'offboarded' && (
                            <button
                              className="offboard-action"
                              title="Offboard employee"
                              onClick={() => setOffboardConfirm(employee)}
                            >
                              Offboard
                            </button>
                          )}

                          <button
                            className="delete-action"
                            title="Delete employee record"
                            onClick={() => deleteEmployee(employee)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && (
              <div className="directory-loading">
                Loading directory...
              </div>
            )}
            {!loading && employeeList.length === 0 && (
              <div className="empty-directory">
                <strong>No employees found</strong>
                <span>Add an employee to build your directory.</span>
              </div>
            )}
          </div>
        </section>

        <footer className="directory-footer">© 2026 Kairos · Multi-Platform HR Identity Lifecycle Engine</footer>
      </main>

      {/* Profile Modal */}
      {selectedEmployee && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={() => setSelectedEmployee(null)}>
          <section className="profile-modal" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div className="profile-modal-avatar">
                {selectedEmployee.initials || selectedEmployee.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <span>Employee Profile &amp; Asset Status</span>
                <h2>{selectedEmployee.name}</h2>
                <p>{selectedEmployee.role}</p>
              </div>
              <button className="profile-close" onClick={() => setSelectedEmployee(null)}>×</button>
            </header>

            <div className="profile-status-row">
              <span className={`status status--${(selectedEmployee.status || 'Active').toLowerCase()}`}>
                {selectedEmployee.status || 'Active'}
              </span>
              <button
                disabled={actionLoading}
                className="retry-provisioning"
                onClick={() => retryProvisioning(selectedEmployee)}
              >
                ↻ Retry Provisioning
              </button>
            </div>

            <div className="profile-details">
              <article>
                <span>Work Email</span>
                <strong>{selectedEmployee.work_email || selectedEmployee.email}</strong>
              </article>
              <article>
                <span>Personal Email</span>
                <strong>{selectedEmployee.personal_email || 'N/A'}</strong>
              </article>
              <article>
                <span>Zoho ZUID</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedEmployee.zoho_zuid || 'Pending'}</strong>
              </article>
              <article>
                <span>Slack User ID</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedEmployee.slack_user_id || 'Pending'}</strong>
              </article>
              <article>
                <span>GitHub Username</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedEmployee.github_username || selectedEmployee.github_invitation_id || 'Pending'}</strong>
              </article>
              <article>
                <span>Jira Account ID</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedEmployee.jira_account_id || 'Pending'}</strong>
              </article>
            </div>

            <footer>
              <button onClick={() => setSelectedEmployee(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}

      {/* Offboarding Confirmation Modal */}
      {offboardConfirm && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={() => setOffboardConfirm(null)}>
          <section className="profile-modal" style={{ maxWidth: '480px' }} onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span className="offboard-title">⚠️ Offboarding Confirmation</span>
                <h2>Offboard {offboardConfirm.name}?</h2>
              </div>
              <button className="profile-close" onClick={() => setOffboardConfirm(null)}>×</button>
            </header>

            <div className="offboard-confirm-content">
              <p>Executing offboarding will perform the following actions:</p>
              <ul style={{ margin: '8px 0 16px 20px', padding: 0 }}>
                <li>Disable Zoho Workplace account and mailbox access.</li>
                <li>Remove user from GitHub Organization / cancel active invitation.</li>
                <li>Revoke access in Jira Software.</li>
                <li>Remove user from all managed Slack channels.</li>
              </ul>
              <div className="offboard-warning">
                <strong>Slack Plan Note:</strong> On non-Enterprise Slack plans, backend removes users from channels. A Slack Workspace Owner must deactivate the Slack user account manually in Slack Admin Console.
              </div>
            </div>

            <footer style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="offboard-cancel" onClick={() => setOffboardConfirm(null)}>
                Cancel
              </button>
              <button
                disabled={actionLoading}
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => executeOffboarding(offboardConfirm)}
              >
                {actionLoading ? 'Offboarding...' : 'Confirm Offboarding'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export default EmployeesPage;
