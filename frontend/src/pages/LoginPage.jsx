import { useState } from 'react';

function Icon({ name, size = 20 }) {
  const paths = {
    brand: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M12 7.5v4M5 15.5v-3.5h14v3.5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    sparkle: <><path d="m12 3 .8 2.2A6.2 6.2 0 0 0 16.5 9l2.2.8-2.2.8a6.2 6.2 0 0 0-3.7 3.8L12 17l-.8-2.6a6.2 6.2 0 0 0-3.7-3.8l-2.2-.8L7.5 9a6.2 6.2 0 0 0 3.7-3.8L12 3Z" /><path d="m19 3 .3.8c.3.8.9 1.4 1.7 1.7l.8.3-.8.3c-.8.3-1.4.9-1.7 1.7l-.3.8-.3-.8A3 3 0 0 0 17 6.1l-.8-.3.8-.3a3 3 0 0 0 1.7-1.7L19 3Z" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></>,
    alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  };

  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function LoginPage() {
  const [status, setStatus] = useState('idle');
  const [email, setEmail] = useState('hr@nigmafest.in');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      let response;
      try {
        response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
      } catch (fetchErr) {
        response = await fetch(`${backendUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid work email or password');
      }

      if (data.session?.access_token) {
        localStorage.setItem('kairos_access_token', data.session.access_token);
      }
      if (data.user) {
        localStorage.setItem('kairos_user', JSON.stringify(data.user));
      }

      setStatus('verified');

      window.setTimeout(() => {
        window.location.assign('/dashboard');
      }, 500);
    } catch (err) {
      setStatus('idle');
      setErrorMessage(err.message || 'Invalid work email or password');
    }
  }

  const buttonContent = {
    idle: <><span>Sign in</span><Icon name="arrow" /></>,
    loading: <><span className="spinner" aria-hidden="true" /><span>Authenticating...</span></>,
    verified: <><Icon name="check" /><span>Verified</span></>,
  }[status];

  return (
    <div className="login-page">
      <div className="background-shape background-shape--one" />
      <div className="background-shape background-shape--two" />

      <main className="login-shell">
        <section className="login-card" aria-labelledby="login-title">
          <header className="login-header">
            <div className="brand-mark"><Icon name="brand" size={28} /></div>
            <div className="brand-copy">
              <p className="eyebrow">PeopleFlow</p>
              <h1 id="login-title">Welcome back</h1>
            </div>
            <p className="login-intro">Sign in to manage your people, payroll, and workplace.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="error-banner" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <Icon name="alert" size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="field-group">
              <label htmlFor="email">Work email</label>
              <div className="input-wrap">
                <Icon name="mail" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hr@nigmafest.in"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <a href="#forgot-password">Forgot password?</a>
              </div>
              <div className="input-wrap">
                <Icon name="lock" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <label className="remember-row">
              <input name="remember" type="checkbox" defaultChecked />
              <span>Remember this device</span>
            </label>

            <button
              className={`submit-button ${status === 'verified' ? 'submit-button--verified' : ''}`}
              type="submit"
              disabled={status !== 'idle'}
            >
              {buttonContent}
            </button>
          </form>

        </section>

        <footer className="login-footer">
          <a href="#privacy">Privacy</a><span aria-hidden="true">•</span>
          <a href="#terms">Terms</a><span aria-hidden="true">•</span>
          <a href="#security">Security</a>
        </footer>
      </main>
    </div>
  );
}

export default LoginPage;
