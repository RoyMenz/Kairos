import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';

function AddEmployeePage() {
  const [employee, setEmployee] = useState({
    name: '',
    email: '',
    role: '',
    joiningDate: '',
    department: 'Engineering',
  });
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [accessSuggestions, setAccessSuggestions] = useState([]);
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
      const data = await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({ ...employee, generateWorkflow: true }),
      });

      setCreatedEmployee(data.employee || null);
      const workflow = data.workflow || {};
      const role = workflow.classifiedRole || data.employee?.classified_role || data.employee?.role || employee.role;
      setSelectedRole(role);
      const suggestedAccess = workflow.access || {};
      setAccessSuggestions([
        { id: 'jira', label: 'Jira', value: suggestedAccess.jira || 'no-access', editing: false },
        { id: 'slack', label: 'Slack', value: suggestedAccess.slack || 'member', editing: false },
        { id: 'git', label: 'Git', value: suggestedAccess.git || 'no-access', editing: false },
      ].filter((item) => item.value !== 'no-access'));
      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Error creating employee & generating AI workflow');
    } finally {
      setLoading(false);
    }
  }

  function updateAccess(id, changes) {
    setAccessSuggestions((current) =>
      current.map((item) => item.id === id ? { ...item, ...changes } : item)
    );
  }

  async function saveAccessEdit(item) {
    try {
      const result = await apiFetch('/api/llm/revise-access', {
        method: 'POST',
        body: JSON.stringify({
          designation: employee.role,
          tool: item.id,
          requestedChange: item.value,
          currentValue: item.value,
        }),
      });
      updateAccess(item.id, { value: result.value, editing: false });
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function removeAccess(id) {
    setAccessSuggestions((current) => current.filter((item) => item.id !== id));
  }

  function finishAccessReview() {
    const review = {
      employeeId: createdEmployee?.employee_id,
      role: selectedRole,
      access: accessSuggestions.map(({ id, label, value }) => ({ id, label, value })),
    };
    localStorage.setItem(`peopleflow-access-${createdEmployee?.employee_id || employee.email}`, JSON.stringify(review));
    window.location.href = '/employees';
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
                  <div style={{ marginLeft: 'auto' }}>
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
          <div className="access-review-modal">
            <header>
              <span>LLM Access Review</span>
              <h2>Review suggested access</h2>
              <p>Edit or remove suggested access for the selected role before finishing.</p>
            </header>

            <section className="access-review-role">
              <span>Selected Role</span>
              <strong>{selectedRole}</strong>
            </section>

            <div className="access-suggestion-list">
              {accessSuggestions.map((item) => (
                <article key={item.id}>
                  <div className="access-suggestion-copy">
                    <strong>{item.label}</strong>
                    {item.editing ? (
                      <input
                        value={item.value}
                        autoFocus
                        onChange={(event) => updateAccess(item.id, { value: event.target.value })}
                      />
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </div>
                  <div className="access-suggestion-actions">
                    <button onClick={() => item.editing ? saveAccessEdit(item) : updateAccess(item.id, { editing: true })}>
                      {item.editing ? 'Save' : 'Edit'}
                    </button>
                    <button className="remove" onClick={() => removeAccess(item.id)}>Remove</button>
                  </div>
                </article>
              ))}
              {accessSuggestions.length === 0 && (
                <p className="access-review-empty">No access will be assigned.</p>
              )}
            </div>

            <div className="access-review-footer">
              <button className="primary-button" onClick={finishAccessReview}>Finish</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AddEmployeePage;
