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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a' }}>
            Onboarding Workflows &amp; Access Completion
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Orchestrate identity provisioning across Google Workspace, Slack, GitHub, and Jira using live backend data.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={triggerActivationCheck}
          disabled={actionLoading}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: actionLoading ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          {actionLoading ? 'Executing Activation Watcher... ✦' : '⚡ Check & Complete All Workflows'}
        </button>
      </section>

      {statusMessage && (
        <div
          style={{
            margin: '16px 0',
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: statusMessage.startsWith('✓') ? '#f0fdf4' : '#fffbe6',
            border: `1px solid ${statusMessage.startsWith('✓') ? '#bbf7d0' : '#ffe58f'}`,
            color: statusMessage.startsWith('✓') ? '#166534' : '#873800',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {statusMessage}
        </div>
      )}

      <section className="workflows-table-card" style={{ marginTop: '20px' }}>
        <header style={{ display: 'flex', gap: '8px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          {['All', 'Awaiting Password', 'Fully Provisioned'].map((tab) => (
            <button
              key={tab}
              className={filter === tab ? 'active' : ''}
              onClick={() => setFilter(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filter === tab ? '#2563eb' : '#cbd5e1',
                backgroundColor: filter === tab ? '#eff6ff' : '#ffffff',
                color: filter === tab ? '#1d4ed8' : '#475569',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ color: '#0f172a' }}>{flow.name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{flow.email}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600', color: '#334155' }}>{flow.role}</span>
                    <br />
                    <small style={{ color: '#2563eb', fontWeight: '500' }}>Role: {flow.classifiedRole}</small>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        backgroundColor: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        color: '#475569',
                        fontSize: '13px',
                      }}
                    >
                      #{flow.channel}
                    </span>
                  </td>
                  <td>
                    {flow.awaitingPassword ? (
                      <span
                        className="status status--provisioning"
                        style={{
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ⏳ Awaiting 1st Password Change
                      </span>
                    ) : (
                      <span
                        className="status status--active"
                        style={{
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ✓ Password Updated
                      </span>
                    )}
                  </td>
                  <td>
                    {flow.externalSent ? (
                      <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '13px' }}>
                        ✓ Access Granted
                      </span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: '500', fontSize: '13px' }}>
                        Pending Password Change
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => triggerExternalAccess(flow.email, flow.classifiedRole)}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#2563eb',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        title="Force release GitHub & Jira access"
                      >
                        Force GitHub &amp; Jira
                      </button>
                      <button
                        onClick={() => triggerSlackInvite(flow.email, flow.role, flow.classifiedRole)}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
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
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
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

        <footer style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
          <span>Active workflows monitored by Gemini AI &amp; Google Workspace Password Watcher</span>
        </footer>
      </section>

      <section
        className="workflow-summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <article style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '20px' }}>ϟ</span>
          <div>
            <strong style={{ fontSize: '22px', color: '#1d4ed8' }}>{combinedFlows.length}</strong>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Onboarding Workflows</p>
          </div>
        </article>

        <article style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <div>
            <strong style={{ fontSize: '22px', color: '#ea580c' }}>
              {combinedFlows.filter((f) => f.awaitingPassword).length}
            </strong>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Awaiting Password Change</p>
          </div>
        </article>

        <article style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <div>
            <strong style={{ fontSize: '22px', color: '#16a34a' }}>
              {combinedFlows.filter((f) => !f.awaitingPassword || f.externalSent).length}
            </strong>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Access Provisioned</p>
          </div>
        </article>
      </section>
    </main>
  );
}

export default WorkflowsPage;
