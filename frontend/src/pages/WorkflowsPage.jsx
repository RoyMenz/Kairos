import { useEffect, useState } from 'react';

function WorkflowsPage() {
  const [pendingWorkflows, setPendingWorkflows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    document.title = 'Workflows & Onboarding Completion | PeopleFlow';
    loadWorkflowData();
  }, []);

  async function loadWorkflowData() {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

      // 1. Fetch pending onboarding records from LLM backend
      let pendingRes;
      try {
        pendingRes = await fetch('/api/onboarding/pending');
      } catch (e) {
        pendingRes = await fetch(`${backendUrl}/api/onboarding/pending`);
      }
      const pendingData = await pendingRes.json();
      if (pendingData.success && pendingData.pending) {
        const list = Object.values(pendingData.pending);
        setPendingWorkflows(list);
      }

      // 2. Fetch employee records from DB backend
      let empRes;
      try {
        empRes = await fetch('/api/employees');
      } catch (e) {
        empRes = await fetch(`${backendUrl}/api/employees`);
      }
      const empData = await empRes.json();
      if (empData.success && empData.employees) {
        setEmployees(empData.employees);
      }
    } catch (err) {
      console.error('Failed to load workflow data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Trigger password change check and release pending onboarding access (Slack, GitHub, Jira)
  async function triggerActivationCheck() {
    setActionLoading(true);
    setStatusMessage('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let res;
      try {
        res = await fetch('/api/onboarding/check-activation', { method: 'POST' });
      } catch (e) {
        res = await fetch(`${backendUrl}/api/onboarding/check-activation`, { method: 'POST' });
      }
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('✓ Executed activation check: Verified password changes and released platform invites (Slack, GitHub, Jira).');
        await loadWorkflowData();
      } else {
        throw new Error(data.error || 'Activation check failed');
      }
    } catch (err) {
      setStatusMessage('⚠️ Notice: ' + (err.message || 'Could not complete activation check'));
    } finally {
      setActionLoading(false);
    }
  }

  // Trigger external onboarding (GitHub + Jira access) for a specific employee
  async function triggerExternalAccess(workEmail, role) {
    setActionLoading(true);
    setStatusMessage('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let res;
      try {
        res = await fetch('/api/onboarding/external', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workEmail, role: role || 'backend' }),
        });
      } catch (e) {
        res = await fetch(`${backendUrl}/api/onboarding/external`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workEmail, role: role || 'backend' }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`✓ GitHub and Jira access invitations dispatched to ${workEmail}.`);
        await loadWorkflowData();
      } else {
        throw new Error(data.error || 'External provisioning failed');
      }
    } catch (err) {
      setStatusMessage('⚠️ ' + (err.message || 'Error triggering external access'));
    } finally {
      setActionLoading(false);
    }
  }

  // Trigger Slack workspace invite for an employee
  async function triggerSlackInvite(email, designation, role) {
    setActionLoading(true);
    setStatusMessage('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let res;
      try {
        res = await fetch('/api/onboarding/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, designation: designation || 'Developer', role }),
        });
      } catch (e) {
        res = await fetch(`${backendUrl}/api/onboarding/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, designation: designation || 'Developer', role }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`✓ Slack workspace invite & channel assignment emailed to ${email}.`);
        await loadWorkflowData();
      } else {
        throw new Error(data.error || 'Slack onboarding failed');
      }
    } catch (err) {
      setStatusMessage('⚠️ ' + (err.message || 'Error triggering Slack invite'));
    } finally {
      setActionLoading(false);
    }
  }

  // Combine employees and pending items into unified active workflow objects
  const combinedFlows = employees.map((emp) => {
    const pendingItem = pendingWorkflows.find(
      (p) => (p.email || '').toLowerCase() === (emp.email || '').toLowerCase()
    );
    return {
      id: emp.employee_id || emp.id || emp.email,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      department: emp.department || 'Engineering',
      classifiedRole: pendingItem?.role || emp.classified_role || 'backend',
      channel: pendingItem?.channel || emp.slack_channel || 'backend-developers',
      awaitingPassword: pendingItem?.awaiting_password_change ?? true,
      externalSent: pendingItem?.external_invites_sent ?? false,
      inviteSent: pendingItem?.invite_sent ?? true,
      createdAt: pendingItem?.created_at || emp.created_at,
    };
  });

  // Also include pending items not yet in employee list
  pendingWorkflows.forEach((p) => {
    if (!combinedFlows.some((f) => f.email.toLowerCase() === p.email.toLowerCase())) {
      combinedFlows.push({
        id: 'KS-' + p.email.split('@')[0],
        name: p.email.split('@')[0],
        email: p.email,
        role: p.designation || 'Developer',
        department: 'Engineering',
        classifiedRole: p.role || 'backend',
        channel: p.channel || 'general',
        awaitingPassword: p.awaiting_password_change ?? false,
        externalSent: p.external_invites_sent ?? false,
        inviteSent: p.invite_sent ?? true,
        createdAt: p.created_at,
      });
    }
  });

  const filteredFlows = combinedFlows.filter((flow) => {
    if (filter === 'Awaiting Password') return flow.awaitingPassword;
    if (filter === 'Fully Provisioned') return flow.externalSent || !flow.awaitingPassword;
    return true;
  });

  return (
    <main className="workflows-main workflows-page">
      <section
        className="workflows-heading"
      >
        <div>
          <h1>
            Onboarding Workflows &amp; Access Completion
          </h1>
          <p>
            Orchestrate identity provisioning across Zoho Workplace, Slack, GitHub, and Jira using live backend data.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={triggerActivationCheck}
          disabled={actionLoading}
        >
          {actionLoading ? 'Executing Activation Watcher... ✦' : '⚡ Check & Complete All Workflows'}
        </button>
      </section>

      {statusMessage && (
        <div className={`workflow-message ${statusMessage.startsWith('✓') ? 'workflow-message--success' : 'workflow-message--warning'}`}>
          {statusMessage}
        </div>
      )}

      <section className="workflows-table-card workflows-live-table">
        <header className="workflow-filter-tabs">
          {['All', 'Awaiting Password', 'Fully Provisioned'].map((tab) => (
            <button
              key={tab}
              className={filter === tab ? 'active' : ''}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </header>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Target Employee</th>
                <th>Role Designation</th>
                <th>Assigned Slack Channel</th>
                <th>Password Activation</th>
                <th>External Access (GitHub / Jira)</th>
                <th>Trigger Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlows.map((flow) => (
                <tr key={flow.email}>
                  <td>
                    <div className="workflow-employee">
                      <strong>{flow.name}</strong>
                      <span>{flow.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="workflow-role">{flow.role}</span>
                    <br />
                    <small className="workflow-classification">Role: {flow.classifiedRole}</small>
                  </td>
                  <td>
                    <span className="workflow-channel">
                      #{flow.channel}
                    </span>
                  </td>
                  <td>
                    {flow.awaitingPassword ? (
                      <span className="workflow-password workflow-password--pending">
                        ⏳ Awaiting 1st Password Change
                      </span>
                    ) : (
                      <span className="workflow-password workflow-password--complete">
                        ✓ Password Updated
                      </span>
                    )}
                  </td>
                  <td>
                    {flow.externalSent ? (
                      <span className="workflow-access workflow-access--granted">
                        ✓ Access Granted
                      </span>
                    ) : (
                      <span className="workflow-access workflow-access--pending">
                        Pending Password Change
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="workflow-row-actions">
                      <button
                        onClick={() => triggerExternalAccess(flow.email, flow.classifiedRole)}
                        disabled={actionLoading}
                        className="workflow-action workflow-action--primary"
                        title="Force release GitHub & Jira access"
                      >
                        Force GitHub &amp; Jira
                      </button>
                      <button
                        onClick={() => triggerSlackInvite(flow.email, flow.role, flow.classifiedRole)}
                        disabled={actionLoading}
                        className="workflow-action"
                        title="Re-send Slack Workspace Invitation"
                      >
                        Send Slack
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="workflow-loading">
              Loading workflow state from backend...
            </div>
          )}

          {!loading && filteredFlows.length === 0 && (
            <div className="empty-directory" style={{ padding: '32px', textAlign: 'center' }}>
              <strong>No active onboarding workflows found</strong>
              <span>Add employees to automatically trigger provisioning workflows.</span>
            </div>
          )}
        </div>

        <footer>
          <span>Active workflows monitored by Gemini AI &amp; Zoho Workplace Password Watcher</span>
        </footer>
      </section>

      <section className="workflow-summary workflow-live-summary">
        <article>
          <span>ϟ</span>
          <div>
            <strong className="workflow-count--primary">{combinedFlows.length}</strong>
            <p>Total Onboarding Workflows</p>
          </div>
        </article>

        <article>
          <span>⏳</span>
          <div>
            <strong className="workflow-count--warning">
              {combinedFlows.filter((f) => f.awaitingPassword).length}
            </strong>
            <p>Awaiting Password Change</p>
          </div>
        </article>

        <article>
          <span>✓</span>
          <div>
            <strong className="workflow-count--success">
              {combinedFlows.filter((f) => !f.awaitingPassword || f.externalSent).length}
            </strong>
            <p>Access Provisioned</p>
          </div>
        </article>
      </section>
    </main>
  );
}

export default WorkflowsPage;
