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

      setCreatedEmployee(data.employee || null);
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
                    Personal Email (For activation invite)
                    <input
                      name="email"
                      value={employee.email}
                      onChange={updateField}
                      placeholder="e.g. sarah.jenkins@gmail.com"
                      type="email"
                      required
                    />
                    <small>ⓘ Official company work email (@nigmafest.in) will be created automatically.</small>
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
                        <span className="ai-button-loading">
                          <i className="ai-button-spinner" aria-hidden="true" />
                          Generating AI Workflow...
                        </span>
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
            <blockquote>“Streamlining onboarding through automated identity management &amp; Gemini AI.”</blockquote>
          </aside>
        </div>
      </main>

      {showSuccess && (
        <div className="success-overlay" role="dialog" aria-modal="true">
          <div className="success-dialog" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="success-check">✓</div>
            <h2>AI Workflow Generated Successfully</h2>

            <div className="success-summary">
              <div>
                <span>Assigned Employee ID</span>
                <strong>{createdEmployee?.employee_id || 'Pending'}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{createdEmployee?.role || employee.role}</strong>
              </div>
            </div>

            <dl className="success-employee-details">
              <div>
                <dt>Name</dt>
                <dd>{createdEmployee?.name || employee.name}</dd>
              </div>
              <div>
                <dt>Personal Email</dt>
                <dd>{employee.email}</dd>
              </div>
              <div>
                <dt>Work Email</dt>
                <dd>{createdEmployee?.email || 'Pending account creation'}</dd>
              </div>
              <div>
                <dt>Date of Joining</dt>
                <dd>{createdEmployee?.joining_date || createdEmployee?.joiningDate || employee.joiningDate}</dd>
              </div>
            </dl>

            <div className="success-actions">
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
