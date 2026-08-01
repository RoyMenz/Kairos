import { useEffect, useState } from 'react';

function AddEmployeePage() {
  const [employee, setEmployee] = useState({
    name: '',
    email: '',
    role: '',
    joiningDate: '',
    department: 'Engineering',
  });
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [aiWorkflow, setAiWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Employee Onboarding | PeopleFlow';
  }, []);

  function updateField(event) {
    setEmployee((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      let response;
      try {
        response = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...employee, generateWorkflow: true }),
        });
      } catch (fetchErr) {
        response = await fetch(`${backendUrl}/api/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...employee, generateWorkflow: true }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add employee record');
      }

      setCreatedEmployee(data.employee);
      setAiWorkflow(data.workflow);
      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Error creating employee & generating AI workflow');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="dashboard-main add-employee-page">
        <div className="page-heading">
          <div>
            <p>
              Employees <span>›</span> Add New Employee
            </p>
          </div>
          <div className="stepper">
            <div className="step active">
              <b>1</b>
              <span>Details</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="form-column">
            <section className="employee-form-card">
              <form onSubmit={handleSubmit}>
                {errorMessage && (
                  <div
                    style={{
                      padding: '12px 14px',
                      marginBottom: '16px',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    ⚠️ {errorMessage}
                  </div>
                )}

                <div className="form-grid">
                  <label>
                    Full Name
                    <input
                      name="name"
                      value={employee.name}
                      onChange={updateField}
                      placeholder="e.g. Sarah Jenkins"
                      required
                    />
                  </label>
                  <label>
                    Work Email / Personal Email
                    <input
                      name="email"
                      value={employee.email}
                      onChange={updateField}
                      placeholder="sarah.j@company.com"
                      type="email"
                      required
                    />
                    <small>ⓘ Domain verified for provisioning.</small>
                  </label>
                  <label>
                    Role / Job Designation
                    <input
                      name="role"
                      value={employee.role}
                      onChange={updateField}
                      placeholder="e.g. Senior Software Engineer"
                      required
                    />
                  </label>
                  <label>
                    Joining Date
                    <input
                      name="joiningDate"
                      value={employee.joiningDate}
                      onChange={updateField}
                      type="date"
                      required
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="secondary-button" type="button">
                    Save as Draft
                  </button>
                  <div>
                    <button className="text-button" type="reset">
                      Cancel
                    </button>
                    <button className="primary-button" type="submit" disabled={loading}>
                      {loading ? (
                        <span>Executing Gemini AI Workflow... ✦</span>
                      ) : (
                        <>
                          Generate AI Workflow <span>✦</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>

          <aside className="preview-card">
            <p className="card-label">Profile Preview</p>
            <div className="profile-preview">
              <div className="large-avatar">
                {employee.name
                  ? employee.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : '＋'}
              </div>
              <h2>{employee.name || 'New Hire'}</h2>
              <p>{employee.role || 'Role not specified'}</p>
            </div>
            <div className="accuracy">
              <div>
                <span>Data Accuracy</span>
                <strong>High (94%)</strong>
              </div>
              <div className="progress">
                <span />
              </div>
            </div>
            <blockquote>“Streamlining onboarding through automated identity management &amp; Gemini AI.”</blockquote>
          </aside>
        </div>
      </main>

      {showSuccess && (
        <div className="success-overlay" role="dialog" aria-modal="true">
          <div className="success-dialog" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="success-check">✓</div>
            <h2 style={{ marginBottom: '4px' }}>AI Workflow Generated &amp; Profile Saved</h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
              Gemini LLM model processed identity provisioning for <strong>{createdEmployee?.name || employee.name}</strong>.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                  Assigned Employee ID
                </span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
                  {createdEmployee?.employee_id || 'KS001'}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>
                  Gemini Role Class
                </span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1d4ed8', marginTop: '2px' }}>
                  {aiWorkflow?.classifiedRole || createdEmployee?.classified_role || 'backend'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textAlign: 'left',
                marginBottom: '18px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                🤖 Automated AI Onboarding Sequence:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', lineHeight: '1.6' }}>
                <li>✓ <strong>Database Record</strong> created in Supabase</li>
                <li>✦ <strong>Gemini LLM</strong> mapped job function to role</li>
                <li>✦ <strong>Slack Channel</strong> routed to <code>#{aiWorkflow?.suggestedChannel || createdEmployee?.slack_channel || 'backend-developers'}</code></li>
                <li>✉ <strong>Workspace Account</strong> created &amp; password activation link sent</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="secondary-button"
                onClick={() => {
                  window.location.href = '/employees';
                }}
              >
                View Employees Directory
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AddEmployeePage;
